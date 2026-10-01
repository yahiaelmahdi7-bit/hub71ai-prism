#!/usr/bin/env python3
"""Calibrate the chaperone grey zone.  collect: live Jev -> raw.jsonl.  fit: offline split + thresholds.

  python3 calibrate.py collect     # asks Jev the SAME two nouls chaperone.py asks (needs key; never printed)
  python3 calibrate.py fit         # FIT/UNSEEN split (seeded, stratified), jev-kit calibrate cross-check,
                                   # writes ../config.json thresholds + ../calibration_result.json
"""
import json
import os
import random
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CH = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(os.path.dirname(CH), "hooks"))
sys.path.insert(0, CH)
RAW = os.path.join(HERE, "raw.jsonl")
JEVKIT = os.path.expanduser("~/Projects/jev-kit/bin/jev-kit")
SEED = 7


def collect():
    import chaperone
    import jev_kit
    os.environ["JEV_LOG"] = os.path.join(HERE, "jev-calibration-decisions.jsonl")
    with open(os.path.join(HERE, "calibration_cases.jsonl")) as f:
        cases = [json.loads(l) for l in f]
    out = []
    for i, c in enumerate(cases):
        state, qs = chaperone.build_jev_request([c["state"]])
        ans = jev_kit.ask(state, qs, timeout=8, site="chaperone-calibration")
        if not ans:
            sys.exit("Jev call failed at case %d; aborting (no partial calibration)" % i)
        out.append({"i": i, "label": c["label"], "uses": ans["uses0"].value, "breaks": ans["breaks0"].value})
    with open(RAW, "w") as f:
        f.write("".join(json.dumps(r) + "\n" for r in out))
    print("collected", len(out))


def score(r, mode):
    u, b = r["uses"], r["breaks"]
    return {"max": max(u, b), "mean": (u + b) / 2, "uses": u, "breaks": b}[mode]


def prf(rows, mode, t):
    tp = sum(1 for r in rows if score(r, mode) >= t and r["label"])
    fp = sum(1 for r in rows if score(r, mode) >= t and not r["label"])
    fn = sum(1 for r in rows if score(r, mode) < t and r["label"])
    return (tp / (tp + fp) if tp + fp else 0.0), (tp / (tp + fn) if tp + fn else 0.0), tp + fp


def fit():
    rows = [json.loads(l) for l in open(RAW)]
    rnd = random.Random(SEED)
    pos = [r for r in rows if r["label"]]
    neg = [r for r in rows if not r["label"]]
    rnd.shuffle(pos), rnd.shuffle(neg)
    fit_rows = pos[: len(pos) // 2] + neg[: len(neg) // 2]
    unseen = pos[len(pos) // 2:] + neg[len(neg) // 2:]
    res = {"n_total": len(rows), "n_fit": len(fit_rows), "n_unseen": len(unseen), "seed": SEED, "modes": {}}
    best = None
    for mode in ("max", "mean", "uses", "breaks"):
        cands = sorted({score(r, mode) for r in fit_rows})
        # t_deny: lowest threshold on FIT with precision >= 0.9 and support >= 3 (most recall at the target)
        td = next((t for t in cands if (lambda p, rc, n: p >= 0.9 and n >= 3)(*prf(fit_rows, mode, t))), None)
        # t_warn: lowest threshold on FIT with precision >= 0.7
        tw = next((t for t in cands if prf(fit_rows, mode, t)[0] >= 0.7), None)
        m = {"t_deny": td, "t_warn": tw}
        if td is not None:
            m["unseen_deny_precision"], m["unseen_deny_recall"], m["unseen_deny_n"] = prf(unseen, mode, td)
        if tw is not None:
            m["unseen_warn_precision"], m["unseen_warn_recall"], m["unseen_warn_n"] = prf(unseen, mode, tw)
        res["modes"][mode] = m
        key = (m.get("unseen_warn_recall", 0) if td is not None else -1)
        if td is not None and mode in ("max", "mean") and (best is None or key > best[0]):
            best = (key, mode)
    mode = best[1] if best else "max"
    res["chosen_mode"] = mode
    m = res["modes"][mode]
    # jev-kit calibrate cross-check on the chosen combined score (confidence = |2p-1|, UNSEEN-gated by the tool)
    cases = os.path.join(HERE, "kit_cases.jsonl")
    with open(cases, "w") as f:
        for r in rows:
            f.write(json.dumps({"score": score(r, mode), "label": r["label"]}) + "\n")
    th = os.path.join(HERE, "kit_thresholds.json")
    if os.path.exists(th):
        os.remove(th)
    kit = subprocess.run([sys.executable, JEVKIT, "calibrate", cases, "--site", "chaperone", "--target-precision", "0.9",
                          "--thresholds", th, "--seed", "7"], capture_output=True, text=True)
    res["jev_kit_calibrate"] = {"rc": kit.returncode, "stdout": kit.stdout.strip(), "stderr": kit.stderr.strip()}
    may_deny = bool(m.get("t_deny") is not None and m.get("unseen_deny_precision", 0) >= 0.9)
    res["jev_may_deny"] = may_deny
    cfg_path = os.path.join(CH, "config.json")
    cfg = json.load(open(cfg_path))
    cfg.update({"jev_combine": mode if mode in ("max", "mean") else "max",
                "t_warn": round(m["t_warn"], 3) if m.get("t_warn") is not None else 0.5,
                "t_deny": round(m["t_deny"], 3) if m.get("t_deny") is not None else 0.9,
                "jev_may_deny": may_deny})
    json.dump(cfg, open(cfg_path, "w"), indent=1)
    json.dump(res, open(os.path.join(CH, "calibration_result.json"), "w"), indent=1)
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    {"collect": collect, "fit": fit}[sys.argv[1]]()
