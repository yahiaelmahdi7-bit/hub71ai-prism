#!/usr/bin/env python3
"""Chaperone: real-time edit-collision gate for a crew of Claude Code agents.

Modes (argv[1]): pre (PreToolUse), post (PostToolUse), stop (SubagentStop).
Code owns the flow. Deterministic rules DENY; Jev only judges the grey zone and fails open.
Python 3 stdlib only. Never raises into Claude Code: any internal error means "allow".
"""
import contextlib
import fcntl
import fnmatch
import hashlib
import json
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SIBLING = os.path.join(os.path.dirname(HERE), "chaperone")  # .claude/chaperone next to .claude/hooks

DEFAULTS = {
    "ttl_seconds": 480,
    "grey_distance_lines": 15,
    "jev_enabled": True,
    "jev_timeout": 1.5,
    "jev_combine": "max",          # how the two nouls of one pair combine: max | mean
    "t_warn": 0.5,
    "t_deny": 0.9,
    "jev_may_deny": False,         # flipped on by calibration only if unseen DENY precision >= 0.9
    "warn_permission_decision": "allow",  # documented form for allow+additionalContext; null = context only
    "max_pairs": 3,
    "max_text_chars": 1200,
    "lane_rule": {"files": ["lib/types.ts", "lib/openai.ts"], "owner": "bankable-orchestrator",
                  "agent_prefix": "bankable-", "main_session_allowed": True},
    "ignore_globs": ["node_modules/*", ".git/*", ".next/*", ".claude/chaperone/*", "*/node_modules/*"],
}
EDIT_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
DECL_RE = re.compile(
    r"^(export\s+)?(default\s+)?(async\s+)?(function\*?|class|interface|type|enum|const|let|var|namespace|def)\b"
    r"|^[.#:@\w\[*&>~+-][^{};]*\{\s*$")


# ------------------------------------------------------------------ paths / store

def _run(args, cwd):
    try:
        r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=5, stdin=subprocess.DEVNULL)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def _existing_dir(path):
    d = os.path.dirname(path) or "."
    while d and not os.path.isdir(d):
        nd = os.path.dirname(d)
        if nd == d:
            break
        d = nd
    return d or "."


def git_info(path, cwd):
    """(toplevel, main_root) for the git tree containing path; main_root is the primary checkout
    (shared by all worktrees) so every worktree sees the same claims store."""
    out = _run(["git", "rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"],
               _existing_dir(path) if os.path.isabs(path) else cwd)
    parts = out.splitlines()
    if len(parts) == 2:
        top, common = os.path.realpath(parts[0]), os.path.realpath(parts[1])
        main = os.path.dirname(common) if os.path.basename(common) == ".git" else top
        return top, main
    return None, None


def store_dir(main_root, cwd):
    env = os.environ.get("CHAPERONE_DIR")
    if env:
        return env
    base = main_root or os.environ.get("CLAUDE_PROJECT_DIR") or cwd or os.getcwd()
    return os.path.join(base, ".claude", "chaperone")


def load_config(sdir):
    cfg = json.loads(json.dumps(DEFAULTS))
    for p in (os.path.join(SIBLING, "config.json"), os.path.join(sdir, "config.json")):
        try:
            with open(p) as f:
                for k, v in json.load(f).items():
                    cfg[k] = {**cfg[k], **v} if isinstance(v, dict) and isinstance(cfg.get(k), dict) else v
        except Exception:
            pass
    return cfg


@contextlib.contextmanager
def locked(sdir):
    os.makedirs(sdir, exist_ok=True)
    with open(os.path.join(sdir, "claims.lock"), "a") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lf, fcntl.LOCK_UN)


def read_claims(sdir):
    try:
        with open(os.path.join(sdir, "claims.json")) as f:
            v = json.load(f)
        return v if isinstance(v, list) else []
    except Exception:
        return []


def write_claims(sdir, claims):
    p = os.path.join(sdir, "claims.json")
    tmp = p + ".%d.tmp" % os.getpid()
    with open(tmp, "w") as f:
        json.dump(claims, f, indent=1)
    os.replace(tmp, p)


def live(claims, now, ttl):
    return [c for c in claims if now - c.get("ts", 0) < ttl]


def log_line(sdir, entry):
    try:
        os.makedirs(sdir, exist_ok=True)
        entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime()), **entry}
        with open(os.path.join(sdir, "log.jsonl"), "a") as f:
            f.write(json.dumps(entry, default=str) + "\n")
    except Exception:
        pass


# ------------------------------------------------------------------ identity

def caller(p):
    """(key, label, agent_type). Subagents carry agent_id/agent_type (hooks reference); the main
    session has neither, so it is keyed by session_id."""
    aid, atype = p.get("agent_id"), p.get("agent_type")
    if aid:
        return "a:" + str(aid), "%s#%s" % (atype or "agent", str(aid)[:6]), atype
    return "main:" + str(p.get("session_id", "?"))[:8], "main-session", atype


# ------------------------------------------------------------------ regions

def read_text(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception:
        return None


def span_of(text, needle, replace_all=False):
    """(start_line, end_line) 1-based of needle in text, or None. replace_all spans all matches."""
    if not needle:
        return None
    i = text.find(needle)
    if i < 0:
        return None
    j = i
    if replace_all:
        j = text.rfind(needle)
    s = text.count("\n", 0, i) + 1
    e = text.count("\n", 0, j + len(needle) - 1) + 1
    return s, e


def lines_text(text, s, e, cap):
    ls = text.split("\n")
    return "\n".join(ls[s - 1:e])[:cap]


def edit_list(tool, ti):
    if tool == "Edit":
        return [(ti.get("old_string", ""), ti.get("new_string", ""), bool(ti.get("replace_all")))]
    if tool == "MultiEdit":
        return [(e.get("old_string", ""), e.get("new_string", ""), bool(e.get("replace_all")))
                for e in ti.get("edits", []) if isinstance(e, dict)]
    return []


def regions_for(tool, ti, path, cfg):
    """[{start,end,old,new,eid}] for the call. Empty list = nothing to collide with (new file/unknown)."""
    text = read_text(path)
    if text is None:
        return [], None  # new file: no conflict
    nlines = text.count("\n") + 1
    cap = cfg["max_text_chars"]
    if tool in ("Write", "NotebookEdit"):
        new = ti.get("content") or ti.get("new_source") or ""
        return [{"start": 1, "end": nlines, "old": text[:cap], "new": new[:cap], "eid": "whole"}], text
    out = []
    for old, new, ra in edit_list(tool, ti):
        sp = span_of(text, old, ra)
        if sp:
            out.append({"start": sp[0], "end": sp[1], "old": old[:cap], "new": new[:cap],
                        "eid": hashlib.sha1(old.encode()).hexdigest()[:8]})
    return out, text


def enclosing_decl(lines, n):
    """Index (1-based line) of nearest declaration-looking line at or above line n, else None."""
    for i in range(min(n, len(lines)), 0, -1):
        if DECL_RE.match(lines[i - 1]):
            return i
    return None


def relocate(claim, text, tree, cap):
    """A claim made in another worktree has other line numbers; find its text in our copy."""
    if claim.get("tree") == tree or text is None:
        return claim["start"], claim["end"]
    for key in ("snippet", "orig"):
        s = claim.get(key) or ""
        if s and len(s) >= 12 and text.count(s) == 1:
            sp = span_of(text, s)
            if sp:
                return sp
    return claim["start"], claim["end"]


def gap(a0, a1, b0, b1):
    return max(a0 - b1, b0 - a1)


def fmt_age(sec):
    sec = int(sec)
    return "%ds" % sec if sec < 90 else "%dm%02ds" % (sec // 60, sec % 60)


# ------------------------------------------------------------------ Jev (grey zone only)

def _jev_ask(state, questions, timeout):
    """Isolated so tests can stub it. Returns jev_kit Answers or None (never raises)."""
    sys.path.insert(0, SIBLING)
    os.environ.setdefault("JEV_LOG", os.path.join(os.environ.get("CHAPERONE_DIR") or SIBLING, "jev-decisions.jsonl"))
    import jev_kit
    return jev_kit.ask(state, questions, timeout=timeout, site="chaperone")


def build_jev_request(pairs):
    import jev_kit  # noqa: needs SIBLING on sys.path (set by _jev_ask caller below)
    state, qs = {}, []
    for i, pr in enumerate(pairs):
        state["p%d" % i] = pr
        qs.append(jev_kit.noul("uses%d" % i,
            "Does `p%d.edit_b` change a name, prop, type or signature (rename, removal, new required "
            "argument, changed shape) that is used inside `p%d.claim_a.region_text`?" % (i, i)))
        qs.append(jev_kit.noul("breaks%d" % i,
            "Would applying `p%d.edit_b` now likely produce a merge conflict with, or break, the change "
            "being made in `p%d.claim_a`?" % (i, i)))
    return state, qs


def jev_judge(pairs, cfg):
    """-> {p, detail} or None (fail-open). One request, all pairs fanned out."""
    try:
        sys.path.insert(0, SIBLING)
        state, qs = build_jev_request(pairs)
        ans = _jev_ask(state, qs, cfg["jev_timeout"])
        if not ans:
            return None
        best, detail = 0.0, {}
        for i in range(len(pairs)):
            u, b = ans["uses%d" % i].value, ans["breaks%d" % i].value
            detail["p%d" % i] = {"uses": round(u, 3), "breaks": round(b, 3)}
            pp = max(u, b) if cfg["jev_combine"] == "max" else (u + b) / 2
            best = max(best, pp)
        return {"p": best, "detail": detail}
    except Exception:
        return None


# ------------------------------------------------------------------ output

def emit_deny(reason):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                              "permissionDecision": "deny",
                                              "permissionDecisionReason": reason}}))


def emit_warn(ctx, cfg):
    h = {"hookEventName": "PreToolUse", "additionalContext": ctx}
    if cfg.get("warn_permission_decision"):
        h["permissionDecision"] = cfg["warn_permission_decision"]
    print(json.dumps({"hookSpecificOutput": h}))


def deny_text(c, rel, age):
    return ("CHAPERONE: blocked. %s is editing %s lines %d-%d (last touched %s ago). Do NOT retry this same "
            "edit. Work on something else, wait a few minutes (the claim expires 8 min after their last edit), "
            "or tell the orchestrator." % (c["label"], rel, c["start"], c["end"], fmt_age(age)))


# ------------------------------------------------------------------ PreToolUse

def kill_switch(sdir):
    return bool(os.environ.get("CHAPERONE_OFF") == "1" or os.path.exists(os.path.join(sdir, "OFF"))
                or os.path.exists(os.path.join(SIBLING, "OFF")))


def do_pre(p):
    t0 = time.monotonic()
    tool = p.get("tool_name", "")
    if tool not in EDIT_TOOLS:
        return
    cwd = p.get("cwd") or os.getcwd()
    ti = p.get("tool_input") or {}
    path = ti.get("file_path") or ti.get("notebook_path") or ""
    if not path:
        return
    if not os.path.isabs(path):
        path = os.path.join(cwd, path)
    path = os.path.realpath(path) if os.path.exists(path) else os.path.join(os.path.realpath(_existing_dir(path)), os.path.basename(path))
    top, main = git_info(path, cwd)
    sdir = store_dir(main, cwd)
    if kill_switch(sdir):
        return
    cfg = load_config(sdir)
    rel = os.path.relpath(path, top or cwd)
    key, label, atype = caller(p)
    base = {"caller": label, "agent_type": atype, "tool": tool, "file": rel}

    def finish(decision, rule, **extra):
        log_line(sdir, {**base, "decision": decision, "rule": rule,
                        "latency_ms": int((time.monotonic() - t0) * 1000), **extra})

    if any(fnmatch.fnmatch(rel, g) for g in cfg["ignore_globs"]):
        return finish("allow", "ignored_path")

    # lane rule (only when identity is reliable: a subagent with a bankable-* agent_type)
    lr = cfg["lane_rule"]
    if rel in lr["files"] and atype and atype.startswith(lr["agent_prefix"]) and atype != lr["owner"]:
        emit_deny("CHAPERONE: lane rule. %s is editable only by %s; you are %s. Do not retry; ask the "
                  "orchestrator to make this change (describe exactly what you need)." % (rel, lr["owner"], atype))
        return finish("deny", "lane_rule")

    regions, text = regions_for(tool, ti, path, cfg)
    if not regions:
        return finish("allow", "new_file_or_unknown_region")
    tree = top or ""
    lines = text.split("\n")
    now = time.time()
    ttl = cfg["ttl_seconds"]
    grey = []  # (region, claim, s, e, why, distance)

    with locked(sdir):
        claims = live(read_claims(sdir), now, ttl)
        for r in regions:
            for c in claims:
                if c["file"] != rel or c["agent"] == key:
                    continue
                cs, ce = relocate(c, text, tree, cfg["max_text_chars"])
                if r["start"] <= ce and cs <= r["end"]:
                    write_claims(sdir, claims)
                    emit_deny(deny_text({**c, "start": cs, "end": ce}, rel, now - c["ts"]))
                    return finish("deny", "overlap", range=[r["start"], r["end"]], holder=c["label"],
                                  holder_range=[cs, ce])
                d = gap(r["start"], r["end"], cs, ce)
                same = (enclosing_decl(lines, r["start"]) is not None
                        and enclosing_decl(lines, r["start"]) == enclosing_decl(lines, cs))
                if d <= cfg["grey_distance_lines"] or same:
                    grey.append((r, c, cs, ce, "same_decl" if same else "near", d))
        # register / refresh this caller's claims (rolled back below if Jev denies)
        added = []
        for r in regions:
            mine = next((c for c in claims if c["file"] == rel and c["agent"] == key
                         and c["start"] <= r["end"] and r["start"] <= c["end"]), None)
            snippet = lines_text(text, r["start"], r["end"], cfg["max_text_chars"])
            if mine:
                mine.update(start=min(mine["start"], r["start"]), end=max(mine["end"], r["end"]), ts=now,
                            snippet=snippet, eid=r["eid"], tree=tree)
            else:
                mine = {"file": rel, "start": r["start"], "end": r["end"], "snippet": snippet, "orig": snippet,
                        "agent": key, "label": label, "purpose": atype or "main session", "ts": now,
                        "eid": r["eid"], "tree": tree}
                claims.append(mine)
                added.append(mine)
        write_claims(sdir, claims)

    if not grey:
        return finish("allow", "no_conflict", range=[regions[0]["start"], regions[-1]["end"]])

    # ---- grey zone: ask Jev (outside the lock)
    grey.sort(key=lambda g: g[5])
    sel = grey[:cfg["max_pairs"]]
    jr = None
    if cfg["jev_enabled"]:
        pairs = [{"file": rel, "distance_lines": max(g[5], 0),
                  "edit_b": {"old": g[0]["old"], "new": g[0]["new"]},
                  "claim_a": {"region_text": g[1]["snippet"], "purpose": g[1].get("purpose")}} for g in sel]
        jr = jev_judge(pairs, cfg)
    g0 = sel[0]
    c0 = g0[1]
    rng = [regions[0]["start"], regions[-1]["end"]]
    if jr is None:
        return finish("allow", "grey_jev_unavailable", range=rng, holder=c0["label"], jev=None)
    pj = jr["p"]
    if pj >= cfg["t_deny"] and cfg["jev_may_deny"]:
        with locked(sdir):
            cl = [c for c in read_claims(sdir) if not any(c.get("ts") == a["ts"] and c["agent"] == a["agent"]
                                                          and c["file"] == a["file"] for a in added)]
            write_claims(sdir, cl)
        emit_deny(deny_text({**c0, "start": g0[2], "end": g0[3]}, rel, now - c0["ts"])
                  + " (Jev judged your change likely incompatible with theirs, p=%.2f.)" % pj)
        return finish("deny", "grey_jev_deny", range=rng, holder=c0["label"], jev=jr["detail"], p=round(pj, 3))
    if pj >= cfg["t_warn"]:
        theirs = (c0.get("snippet") or "")[:240].replace("\n", " ⏎ ")
        emit_warn("CHAPERONE heads-up: %s is editing %s lines %d-%d (%s ago), close to your edit (%d lines "
                  "away). Jev rates the chance your change clashes with theirs at %.2f. Keep names, props, types "
                  "and signatures they use compatible; re-read the file before further edits. Their region: %s"
                  % (c0["label"], rel, g0[2], g0[3], fmt_age(now - c0["ts"]), max(g0[5], 0), pj, theirs), cfg)
        return finish("warn", "grey_jev_warn", range=rng, holder=c0["label"], jev=jr["detail"], p=round(pj, 3))
    return finish("allow", "grey_jev_clear", range=rng, holder=c0["label"], jev=jr["detail"], p=round(pj, 3))


# ------------------------------------------------------------------ PostToolUse / SubagentStop

def do_post(p):
    tool = p.get("tool_name", "")
    if tool not in EDIT_TOOLS:
        return
    cwd = p.get("cwd") or os.getcwd()
    ti = p.get("tool_input") or {}
    path = ti.get("file_path") or ti.get("notebook_path") or ""
    if not path:
        return
    path = os.path.realpath(path if os.path.isabs(path) else os.path.join(cwd, path))
    top, main = git_info(path, cwd)
    sdir = store_dir(main, cwd)
    if kill_switch(sdir):
        return
    cfg = load_config(sdir)
    rel = os.path.relpath(path, top or cwd)
    key, label, _ = caller(p)
    text = read_text(path)
    if text is None:
        return
    now = time.time()
    with locked(sdir):
        claims = live(read_claims(sdir), now, cfg["ttl_seconds"])
        mine = [c for c in claims if c["file"] == rel and c["agent"] == key]
        if tool in ("Write", "NotebookEdit"):
            for c in mine:
                c.update(start=1, end=text.count("\n") + 1, ts=now, snippet=text[:cfg["max_text_chars"]])
        else:
            for old, new, ra in edit_list(tool, ti):
                eid = hashlib.sha1(old.encode()).hexdigest()[:8]
                c = next((c for c in mine if c.get("eid") == eid), None)
                sp = span_of(text, new, ra) if new else None
                if c and sp:
                    c.update(start=sp[0], end=sp[1], ts=now, eid="post",
                             snippet=lines_text(text, sp[0], sp[1], cfg["max_text_chars"]))
                elif c:
                    c["ts"] = now
                elif sp:
                    sn = lines_text(text, sp[0], sp[1], cfg["max_text_chars"])
                    claims.append({"file": rel, "start": sp[0], "end": sp[1], "snippet": sn, "orig": sn,
                                   "agent": key, "label": label, "purpose": p.get("agent_type") or "main session",
                                   "ts": now, "eid": "post", "tree": top or ""})
        write_claims(sdir, claims)
    log_line(sdir, {"caller": label, "tool": tool, "file": rel, "decision": "refresh", "rule": "post"})


def do_stop(p):
    cwd = p.get("cwd") or os.getcwd()
    top, main = git_info(cwd, cwd)
    sdir = store_dir(main, cwd)
    key, label, _ = caller(p)
    with locked(sdir):
        claims = read_claims(sdir)
        keep = [c for c in claims if c["agent"] != key]
        write_claims(sdir, keep)
    log_line(sdir, {"caller": label, "decision": "release", "rule": "subagent_stop", "released": len(claims) - len(keep)})


def main(argv):
    mode = argv[1] if len(argv) > 1 else "pre"
    try:
        raw = sys.stdin.read()
        p = json.loads(raw) if raw.strip() else {}
        {"pre": do_pre, "post": do_post, "stop": do_stop}.get(mode, lambda _: None)(p)
    except Exception as e:  # fail open, always
        try:
            log_line(store_dir(None, os.getcwd()), {"decision": "allow", "rule": "internal_error", "error": repr(e)[:200]})
        except Exception:
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
