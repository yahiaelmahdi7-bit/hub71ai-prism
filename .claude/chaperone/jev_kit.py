# jev-kit v0.2.0 — vendored from ~/Projects/jev-kit. Do not edit here; change the kit and run: jev-kit sync
"""Zero-dependency Jev (TypeSafe System One) client: typed questions in, typed answers out.

Code owns control flow; Jev answers narrow questions; code combines answers and routes on confidence.
Python 3.10+, stdlib only. ask() NEVER raises: any failure returns None so callers keep their old behaviour.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Callable, Mapping, Sequence

KIT_VERSION = "0.2.0"
ENDPOINT = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-latest"
NONE_OPTION = "none"
NONE_DESCRIPTION = "None of the other options applies."
KEYCHAIN_SERVICE = "net.prismlens.jev-cli"
KEYCHAIN_ACCOUNT = "typesafe"

Transport = Callable[[str, dict, bytes, float], "tuple[int, bytes]"]


# ---------------------------------------------------------------- key

def _keychain_key() -> str | None:
    if sys.platform != "darwin" or os.environ.get("JEV_NO_KEYCHAIN"):
        return None
    try:
        r = subprocess.run(
            ["/usr/bin/security", "find-generic-password", "-s", KEYCHAIN_SERVICE,
             "-a", KEYCHAIN_ACCOUNT, "-w"],
            capture_output=True, text=True, timeout=3, stdin=subprocess.DEVNULL)
    except Exception:
        return None
    key = r.stdout.strip() if r.returncode == 0 else ""
    return key or None


def resolve_key(env: Mapping[str, str] | None = None) -> str | None:
    """env TYPESAFE_API_KEY -> macOS Keychain -> None. The key is never logged."""
    e = os.environ if env is None else env
    k = e.get("TYPESAFE_API_KEY")
    return k if k else _keychain_key()


# ---------------------------------------------------------------- questions

@dataclass(frozen=True)
class Question:
    id: str
    body: dict


def _crit(v: Any) -> Any:
    """Criteria value: string when only `what`, object when it carries not_for/examples/signals."""
    if isinstance(v, Mapping):
        if set(v) <= {"what"}:
            return v.get("what")
        return {k: x for k, x in v.items() if x is not None}
    return v


def noul(id: str, instruction: Any) -> Question:
    return Question(id, {"type": "noul", "instructions": instruction})


def choice(id: str, instruction: Any, options: Sequence[str] | Mapping[str, Any],
           allow_none: bool = True) -> Question:
    if isinstance(options, Mapping):
        criteria = {name: _crit(spec) for name, spec in options.items()}
    else:
        criteria = {name: None for name in options}
    if allow_none and NONE_OPTION not in criteria:
        criteria[NONE_OPTION] = NONE_DESCRIPTION
    return Question(id, {"type": "choice", "instructions": instruction, "criteria": criteria})


def score(id: str, instruction: Any, levels: Sequence[Any]) -> Question:
    """levels: ordered, 0-indexed. Each a string or {what, signals?}."""
    return Question(id, {"type": "score", "instructions": instruction,
                         "criteria": [_crit(lv) for lv in levels]})


# ---------------------------------------------------------------- answers

@dataclass(frozen=True)
class Answer:
    id: str
    type: str
    value: Any                      # noul prob | choice name | score position
    confidence: float | None        # noul: derived |2p-1| (the API gives none)
    probabilities: dict | None = None
    legend: dict | None = None


class Answers(dict):
    """dict id -> Answer, plus the route taken (if ask() was asked to route)."""
    route: str | None = None


def _decode(raw: Any) -> Answers | None:
    if not isinstance(raw, dict) or not isinstance(raw.get("answers"), dict):
        return None
    out = Answers()
    for qid, a in raw["answers"].items():
        if not isinstance(a, dict):
            continue
        t = a.get("type")
        if t == "noul" and isinstance(a.get("noul"), (int, float)):
            p = float(a["noul"])
            out[qid] = Answer(qid, t, p, abs(2 * p - 1))
        elif t == "choice" and isinstance(a.get("choice"), str):
            out[qid] = Answer(qid, t, a["choice"], a.get("confidence"), a.get("probabilities"))
        elif t == "score" and isinstance(a.get("score"), (int, float)):
            out[qid] = Answer(qid, t, float(a["score"]), a.get("confidence"),
                              a.get("probabilities"), a.get("legend"))
    return out


# ---------------------------------------------------------------- thresholds / route

def route(p_or_conf: float | None, act_at: float, review_at: float) -> str:
    """The flowchart diamond. None (Jev unavailable) escalates."""
    if act_at < review_at:
        raise ValueError("act_at must be >= review_at")
    if p_or_conf is None:
        return "escalate"
    if p_or_conf >= act_at:
        return "act"
    if p_or_conf >= review_at:
        return "review"
    return "escalate"


def _thresholds_path() -> str | None:
    env = os.environ.get("JEV_THRESHOLDS")
    if env:
        return env
    d = os.getcwd()
    while True:
        p = os.path.join(d, "jev-thresholds.json")
        if os.path.exists(p):
            return p
        if os.path.exists(os.path.join(d, ".git")) or os.path.dirname(d) == d:
            return None
        d = os.path.dirname(d)


_REGISTERED: dict = {}


def register_thresholds(table: dict) -> None:
    """In-memory thresholds that win over jev-thresholds.json (serverless bundles don't ship the file)."""
    global _REGISTERED
    _REGISTERED = dict(table) if isinstance(table, dict) else {}


def thresholds(site: str) -> dict | None:
    """{act_at, review_at, ...} for a site: registered table first, then jev-thresholds.json, else None."""
    r = _REGISTERED.get(site)
    if isinstance(r, dict) and "act_at" in r and "review_at" in r:
        return r
    p = _thresholds_path()
    if not p:
        return None
    try:
        with open(p) as f:
            t = json.load(f).get(site)
        if isinstance(t, dict) and "act_at" in t and "review_at" in t:
            return t
    except Exception:
        pass
    return None


# ---------------------------------------------------------------- combine

def _term(a: Answer, option: str | None) -> float:
    if a.type == "noul":
        return a.value
    if a.type == "score":
        n = len(a.legend or a.probabilities or {}) or 2
        return a.value / max(n - 1, 1)
    if option is not None and a.probabilities:
        return float(a.probabilities.get(option, 0.0))
    raise TypeError(f"combine: choice '{a.id}' needs a weight key 'id=option'")


def combine(answers: Mapping[str, Answer] | None, weights: Mapping[str, float]) -> float | None:
    """Weighted sum in code: noul -> p, score -> position/(levels-1), choice via key 'id=option'."""
    if answers is None:
        return None
    total = 0.0
    for key, w in weights.items():
        qid, _, option = key.partition("=")
        total += w * _term(answers[qid], option or None)
    return total


# ---------------------------------------------------------------- log

def _log_path() -> str:
    return os.environ.get("JEV_LOG") or os.path.join(".jev", "decisions.jsonl")


def _sha(state: Any) -> str:
    return hashlib.sha256(json.dumps(state, sort_keys=True, default=str).encode()).hexdigest()


def _log(site: str, qids: list, answers: Answers | None, latency_ms: int, route_: str | None,
         calibrated: bool, state: Any, log_state: bool, baseline: Any = None) -> None:
    try:
        entry = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "site": site,
            "kit_version": KIT_VERSION, "question_ids": qids,
            "answers": None if answers is None else
            {k: {"value": a.value, "confidence": a.confidence} for k, a in answers.items()},
            "latency_ms": latency_ms, "route": route_, "calibrated": calibrated,
            "state_sha256": _sha(state),
        }
        if log_state:
            entry["state"] = state
        if baseline is not None:
            entry["baseline"] = baseline
        p = _log_path()
        os.makedirs(os.path.dirname(p) or ".", exist_ok=True)
        with open(p, "a") as f:
            f.write(json.dumps(entry, default=str) + "\n")
    except Exception:
        pass


# ---------------------------------------------------------------- ask

def _urllib_transport(url: str, headers: dict, body: bytes, timeout: float) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""


def ask(state: Any, questions: Sequence[Question], timeout: float = 4.0, *, site: str = "default",
        log_state: bool = False, baseline: Any = None, route_on: str | None = None, act_at: float | None = None,
        review_at: float | None = None, api_key: str | None = None,
        transport: Transport | None = None) -> Answers | None:
    """ONE batched request. Returns Answers, or None on any failure (never raises).

    route_on=<question id> also routes that answer's confidence (act_at/review_at, else
    thresholds(site)) and records it in the log and on Answers.route.
    baseline=<label> is the caller's OLD decision (never raw user text); logged as-is, never sent.
    """
    t0 = time.monotonic()
    answers: Answers | None = None
    try:
        key = api_key or resolve_key()
        body = json.dumps({"model": MODEL, "state": state,
                           "questions": {q.id: q.body for q in questions}}).encode()
        if key:
            send = transport or _urllib_transport
            headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
            box: list = []

            def work() -> None:
                try:
                    box.append(send(ENDPOINT, headers, body, timeout))
                except Exception:
                    pass

            th = threading.Thread(target=work, daemon=True)
            th.start()
            th.join(timeout)  # hard deadline even if the transport ignores its own timeout
            if box and 200 <= box[0][0] < 300:
                answers = _decode(json.loads(box[0][1]))
    except Exception:
        answers = None

    route_: str | None = None
    cal = False
    try:
        if route_on:
            t = {"act_at": act_at, "review_at": review_at} if act_at is not None and review_at is not None \
                else thresholds(site)
            cal = act_at is None and t is not None
            if t:
                a = answers.get(route_on) if answers else None
                route_ = route(a.confidence if a else None, t["act_at"], t["review_at"])
    except Exception:
        route_ = None
    if answers is not None:
        answers.route = route_
    _log(site, [q.id for q in questions], answers, int((time.monotonic() - t0) * 1000), route_,
         cal, state, log_state, baseline)
    return answers
