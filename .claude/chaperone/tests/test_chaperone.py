"""Chaperone tests: simulated hook JSON through the real hook script (stdlib unittest).
Run: python3 -m unittest -v   (from this directory). No network: Jev is disabled via env."""
import io, json, os, shutil, subprocess, sys, tempfile, time, unittest
from contextlib import redirect_stdout

HERE = os.path.dirname(os.path.abspath(__file__))
HOOK = os.path.join(HERE, "..", "..", "hooks", "chaperone.py")
CLI = os.path.join(HERE, "..", "bin", "chaperone")
sys.path.insert(0, os.path.dirname(HOOK))

FILE = "\n".join(
    ["import React from 'react'", ""]
    + ["export function Card(props: { title: string }) {", "  const a = props.title", "  return <div>{a}</div>", "}", ""]
    + ["// filler %d" % i for i in range(40)]
    + ["", "export function Footer() {", "  return <footer>bye</footer>", "}", ""])


def dump(path, obj):
    with open(path, "w") as f:
        json.dump(obj, f)


def git(cwd, *a):
    subprocess.run(["git", *a], cwd=cwd, check=True, capture_output=True,
                   env={**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t",
                        "GIT_COMMITTER_EMAIL": "t@t"})


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = os.path.realpath(tempfile.mkdtemp(prefix="cpt_"))
        self.repo = os.path.join(self.tmp, "repo")
        os.makedirs(os.path.join(self.repo, "app"))
        os.makedirs(os.path.join(self.repo, "lib"))
        git(self.repo, "init", "-q")
        for f in ("app/page.tsx", "lib/types.ts"):
            with open(os.path.join(self.repo, f), "w") as fh:
                fh.write(FILE)
        git(self.repo, "add", "-A"); git(self.repo, "commit", "-qm", "init")
        self.store = os.path.join(self.tmp, "store")
        self.env = {**os.environ, "CHAPERONE_DIR": self.store, "JEV_NO_KEYCHAIN": "1"}
        for k in ("TYPESAFE_API_KEY", "CHAPERONE_OFF"):
            self.env.pop(k, None)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def run_hook(self, mode, payload, env=None, cwd=None):
        t = time.monotonic()
        r = subprocess.run([sys.executable, HOOK, mode], input=json.dumps(payload), capture_output=True, text=True,
                           env=env or self.env, cwd=cwd or self.repo)
        self.last_ms = (time.monotonic() - t) * 1000
        self.assertEqual(r.returncode, 0, r.stderr)
        return json.loads(r.stdout)["hookSpecificOutput"] if r.stdout.strip() else None

    def edit(self, agent, old, new, file="app/page.tsx", root=None, atype="bankable-frontend", mode="pre", env=None):
        root = root or self.repo
        p = {"hook_event_name": "PreToolUse", "tool_name": "Edit", "cwd": root, "session_id": "s-main-1234",
             "tool_input": {"file_path": os.path.join(root, file), "old_string": old, "new_string": new}}
        if agent:
            p.update(agent_id=agent, agent_type=atype)
        return self.run_hook(mode, p, env=env)

    def log(self):
        with open(os.path.join(self.store, "log.jsonl")) as f:
            return [json.loads(l) for l in f if l.strip()]

    def claims(self):
        with open(os.path.join(self.store, "claims.json")) as f:
            return json.load(f)


class Deterministic(Base):
    def test_exact_overlap_denied(self):
        self.assertIsNone(self.edit("aaa111", "const a = props.title", "const a = props.name"))
        out = self.edit("bbb222", "const a = props.title", "const a = 1")
        self.assertEqual(out["permissionDecision"], "deny")
        r = out["permissionDecisionReason"]
        self.assertIn("bankable-frontend#aaa111", r)
        self.assertIn("lines 4-4", r)
        self.assertIn("Do NOT retry", r)
        self.assertEqual(self.log()[-1]["rule"], "overlap")

    def test_far_apart_allowed(self):
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        self.assertIsNone(self.edit("bbb222", "return <footer>bye</footer>", "return <footer>hi</footer>"))
        self.assertEqual(self.log()[-1]["rule"], "no_conflict")

    def test_same_agent_allowed(self):
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        self.assertIsNone(self.edit("aaa111", "const a = props.title", "const a = props.label"))

    def test_ttl_expiry_allows(self):
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        cp = os.path.join(self.store, "claims.json")
        cl = self.claims()
        for c in cl:
            c["ts"] -= 9 * 60
        dump(cp, cl)
        self.assertIsNone(self.edit("bbb222", "const a = props.title", "const a = 1"))
        self.assertEqual(self.log()[-1]["rule"], "no_conflict")

    def test_write_vs_claim_denied(self):
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        p = {"tool_name": "Write", "cwd": self.repo, "agent_id": "bbb222", "agent_type": "bankable-frontend",
             "tool_input": {"file_path": os.path.join(self.repo, "app/page.tsx"), "content": "export default 1\n"}}
        out = self.run_hook("pre", p)
        self.assertEqual(out["permissionDecision"], "deny")

    def test_write_new_file_allowed(self):
        p = {"tool_name": "Write", "cwd": self.repo, "agent_id": "bbb222", "agent_type": "bankable-frontend",
             "tool_input": {"file_path": os.path.join(self.repo, "app/new.tsx"), "content": "x\n"}}
        self.assertIsNone(self.run_hook("pre", p))
        self.assertEqual(self.log()[-1]["rule"], "new_file_or_unknown_region")

    def test_multiedit_second_edit_overlap_denied(self):
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        p = {"tool_name": "MultiEdit", "cwd": self.repo, "agent_id": "bbb222", "agent_type": "bankable-frontend",
             "tool_input": {"file_path": os.path.join(self.repo, "app/page.tsx"), "edits": [
                 {"old_string": "return <footer>bye</footer>", "new_string": "return <footer/>"},
                 {"old_string": "const a = props.title", "new_string": "const a = 2"}]}}
        self.assertEqual(self.run_hook("pre", p)["permissionDecision"], "deny")

    def test_worktree_normalisation(self):
        wt = os.path.join(self.tmp, "wt")
        git(self.repo, "worktree", "add", "-q", wt, "-b", "feat")
        self.edit("aaa111", "const a = props.title", "const a = props.name", root=self.repo)
        out = self.edit("bbb222", "const a = props.title", "const a = 1", root=wt)
        self.assertEqual(out["permissionDecision"], "deny")
        self.assertEqual(self.log()[-1]["file"], "app/page.tsx")  # same logical file, no worktree prefix
        # and the reverse direction: claim in worktree blocks the main checkout
        self.edit("ccc333", "return <footer>bye</footer>", "return <footer/>", root=wt)
        out = self.edit("ddd444", "return <footer>bye</footer>", "return null", root=self.repo)
        self.assertEqual(out["permissionDecision"], "deny")

    def test_worktree_store_is_shared_without_env_override(self):
        wt = os.path.join(self.tmp, "wt2")
        git(self.repo, "worktree", "add", "-q", wt, "-b", "feat2")
        env = {k: v for k, v in self.env.items() if k != "CHAPERONE_DIR"}
        self.edit("aaa111", "const a = props.title", "const a = props.name", root=wt, env=env)
        self.assertTrue(os.path.exists(os.path.join(self.repo, ".claude", "chaperone", "claims.json")))
        self.assertFalse(os.path.exists(os.path.join(wt, ".claude", "chaperone", "claims.json")))

    def test_kill_switch_env(self):
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        out = self.edit("bbb222", "const a = props.title", "const a = 1", env={**self.env, "CHAPERONE_OFF": "1"})
        self.assertIsNone(out)

    def test_kill_switch_file(self):
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        open(os.path.join(self.store, "OFF"), "w").close()
        self.assertIsNone(self.edit("bbb222", "const a = props.title", "const a = 1"))

    def test_lane_rule(self):
        out = self.edit("fff666", "export function Footer", "export function Foot", file="lib/types.ts",
                        atype="bankable-frontend")
        self.assertEqual(out["permissionDecision"], "deny")
        self.assertIn("bankable-orchestrator", out["permissionDecisionReason"])
        self.assertIsNone(self.edit("ooo000", "export function Footer", "export function Foot", file="lib/types.ts",
                                    atype="bankable-orchestrator"))
        # main session (no agent_id): identity unreliable -> lane rule skipped
        self.assertIsNone(self.edit(None, "// filler 30", "// filler thirty", file="lib/types.ts"))

    def test_subagent_stop_releases(self):
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        self.assertTrue(self.claims())
        self.run_hook("stop", {"hook_event_name": "SubagentStop", "cwd": self.repo, "agent_id": "aaa111",
                               "agent_type": "bankable-frontend"})
        self.assertEqual(self.claims(), [])
        self.assertIsNone(self.edit("bbb222", "const a = props.title", "const a = 1"))

    def test_post_refreshes_claim(self):
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        cl = self.claims(); old_ts = cl[0]["ts"] - 100
        cl[0]["ts"] = old_ts
        dump(os.path.join(self.store, "claims.json"), cl)
        p = {"tool_name": "Edit", "cwd": self.repo, "agent_id": "aaa111", "agent_type": "bankable-frontend",
             "tool_input": {"file_path": os.path.join(self.repo, "app/page.tsx"),
                            "old_string": "const a = props.title", "new_string": "const a = props.name"}}
        self.run_hook("post", p)
        self.assertGreater(self.claims()[0]["ts"], old_ts + 90)

    def test_latency_under_150ms(self):
        self.edit("aaa111", "const a = props.title", "const a = props.name")  # warm
        times = []
        for _ in range(5):
            self.edit("bbb222", "const a = props.title", "const a = 1")
            times.append(self.last_ms)
            logged = self.log()[-1]["latency_ms"]
            self.assertLess(logged, 150)
        best = min(times)
        print("   deterministic path wall time incl. python startup: best %.0f ms, all %s" % (best, [round(t) for t in times]))
        self.assertLess(best, 150)


class GreyZone(Base):
    NEAR = ("export function Card(props: { title: string }) {", "export function Card(props: { name: string }) {")

    def grey(self):
        # A edits line 4; B edits line 3 (the signature) -> adjacent, not overlapping
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        return self.edit("bbb222", *self.NEAR)

    def test_jev_unavailable_fails_open_but_overlap_still_denies(self):
        self.assertIsNone(self.grey())
        self.assertEqual(self.log()[-1]["rule"], "grey_jev_unavailable")
        out = self.edit("ccc333", "const a = props.title", "const a = 9")
        self.assertEqual(out["permissionDecision"], "deny")

    def _with_jev(self, uses, breaks, may_deny=True):
        import chaperone

        class A:
            def __init__(s, v): s.value = v

        def fake(state, qs, timeout):
            return {q.id if hasattr(q, "id") else q["id"]: A(uses if "uses" in (q.id if hasattr(q, "id") else q["id"]) else breaks) for q in qs}

        old = (chaperone._jev_ask, os.environ.get("CHAPERONE_DIR"), os.environ.get("CHAPERONE_OFF"))
        chaperone._jev_ask = fake
        os.environ["CHAPERONE_DIR"] = self.store
        os.environ.pop("CHAPERONE_OFF", None)
        buf = io.StringIO()
        try:
            self.edit("aaa111", "const a = props.title", "const a = props.name")
            cfgp = os.path.join(self.store, "config.json")
            dump(cfgp, {"jev_may_deny": may_deny})
            p = {"tool_name": "Edit", "cwd": self.repo, "agent_id": "bbb222", "agent_type": "bankable-frontend",
                 "tool_input": {"file_path": os.path.join(self.repo, "app/page.tsx"),
                                "old_string": self.NEAR[0], "new_string": self.NEAR[1]}}
            with redirect_stdout(buf):
                chaperone.do_pre(p)
        finally:
            chaperone._jev_ask = old[0]
            for k, v in (("CHAPERONE_DIR", old[1]), ("CHAPERONE_OFF", old[2])):
                if v is None: os.environ.pop(k, None)
                else: os.environ[k] = v
        out = json.loads(buf.getvalue())["hookSpecificOutput"] if buf.getvalue().strip() else None
        return out, self.log()[-1]

    def test_jev_high_denies(self):
        out, row = self._with_jev(0.95, 0.9)
        self.assertEqual(out["permissionDecision"], "deny")
        self.assertEqual(row["rule"], "grey_jev_deny")
        # rolled back: B's claim must not linger after a Jev deny
        self.assertEqual([c["agent"] for c in self.claims()], ["a:aaa111"])

    def test_jev_high_but_may_not_deny_only_warns_or_allows(self):
        out, row = self._with_jev(0.95, 0.9, may_deny=False)
        self.assertEqual(row["rule"], "grey_jev_warn")
        self.assertEqual(out["permissionDecision"], "allow")
        self.assertIn("heads-up", out["additionalContext"])

    def test_jev_middle_warns(self):
        out, row = self._with_jev(0.3, 0.3)
        self.assertEqual(row["rule"], "grey_jev_warn")
        self.assertIn("bankable-frontend#aaa111", out["additionalContext"])

    def test_jev_low_allows_silently(self):
        out, row = self._with_jev(0.03, 0.05)
        self.assertIsNone(out)
        self.assertEqual(row["rule"], "grey_jev_clear")


class Cli(Base):
    def cli(self, *a):
        r = subprocess.run([sys.executable, CLI, *a], capture_output=True, text=True, env=self.env, cwd=self.repo)
        self.assertEqual(r.returncode, 0, r.stderr)
        return r.stdout

    def test_status_log_release_off_on(self):
        self.assertIn("Nobody is holding", self.cli("status"))
        self.edit("aaa111", "const a = props.title", "const a = props.name")
        s = self.cli("status")
        self.assertIn("bankable-frontend#aaa111 is editing app/page.tsx lines 4-4", s)
        self.assertIn("no_conflict", self.cli("log", "5"))
        self.assertIn("Released 1", self.cli("release", "aaa111"))
        self.assertIn("Nobody is holding", self.cli("status"))
        self.cli("off")
        self.assertIn("OFF", self.cli("status"))
        self.edit("aaa111", "const a = props.title", "const a = props.x")
        self.assertIsNone(self.edit("bbb222", "const a = props.title", "const a = 1"))
        self.cli("on")
        self.assertIn("ON", self.cli("status"))


if __name__ == "__main__":
    unittest.main()
