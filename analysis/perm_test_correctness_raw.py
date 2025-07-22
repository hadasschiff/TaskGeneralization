#!/usr/bin/env python3
"""
perm_test_vehicle_shuffled.py   – REV-K (2025-07-13)
────────────────────────────────────────────────────
Identical to REV-J except:

▶ Valid-generalization statistic is now the grand-mean of the
  per-participant means (subject-level aggregation), both for the
  observed data and for every permutation.
"""

import sys, json, re, numpy as np, pandas as pd
from pathlib import Path
from random import shuffle
import matplotlib.pyplot as plt
import seaborn as sns

# ───────── helpers (unchanged) ────────────────────────────────────────────
CAR_TYPES   = {"small_car", "big_car", "medium_car"}
TRUCK_TYPES = {"small_sedan", "big_sedan", "medium_sedan"}

def allowed_keys(v):
    return {
        "small_car":      {"w","a","x","d"},
        "big_car":        {"f","c","s","e"},
        "medium_car":     {"w","a","x","d","f","c","s","e"},
        "small_sedan":    {"y","n","g","j"},
        "big_sedan":      {"u","m","h","k"},
        "medium_sedan":   {"y","n","g","j","u","m","h","k"},
    }.get(v, set())

def key_to_dir(key, v):
    key, v = key.lower(), v.lower()
    match v:
        case "small_car":    return "left" if key=="a" else "right" if key=="d" else "up" if key=="w" else "down" if key=="x" else ""
        case "big_car":      return "left" if key=="s" else "right" if key=="f" else "up" if key=="e" else "down" if key=="c" else ""
        case "medium_car":   return "left" if key in {"a","s"} else "right" if key in {"d","f"} else "up" if key in {"w","e"} else "down" if key in {"x","c"} else ""
        case "small_sedan":  return "left" if key=="g" else "right" if key=="j" else "up" if key=="y" else "down" if key=="n" else ""
        case "big_sedan":    return "left" if key=="h" else "right" if key=="k" else "up" if key=="u" else "down" if key=="m" else ""
        case "medium_sedan": return "left" if key in {"g","h"} else "right" if key in {"j","k"} else "up" if key in {"y","u"} else "down" if key in {"n","m"} else ""
        case _:              return ""

def translate_seq(seq, vt):
    return [key_to_dir(k, vt) for k in seq]

def optimal_list(js):
    try:
        return [d.lower() for d in json.loads(js)]
    except Exception:
        return []

def raw_correct(seq_dirs, opt_dirs):
    m = min(len(seq_dirs), len(opt_dirs))
    return sum(seq_dirs[i] == opt_dirs[i] for i in range(m))

def safe_str(x):        # NaN / None → ""
    return str(x) if x is not None and x == x else ""

def recompute_correct(row):
    vt   = safe_str(row.vehicleType).lower()
    plan = safe_str(row.plan_seq).lower()
    return raw_correct(translate_seq(plan, vt), optimal_list(row.optimalRoute))

def recompute_valid(row):
    import numpy as np
    vt   = safe_str(row.vehicleType).lower()
    plan = safe_str(row.plan_seq).lower()
    allowed = allowed_keys(vt)
    if not plan or not allowed:
        return 0
    # 1 point for every key that matches the vehicle’s allowed set
    hits    = [k in allowed for k in plan]
    return np.mean(hits)


def p_val_gt(null, obs):
    return ( (null >= obs).sum() + 1 ) / (len(null) + 1)

# ───────── main ────────────────────────────────────────────────────────────
CSV = Path(sys.argv[1] if len(sys.argv) > 1 else "game_trials_export.csv")
if not CSV.exists():
    sys.exit(f"CSV not found: {CSV}")

df = pd.read_csv(CSV)
df = df[df["phase"] == 2]                 # keep Phase-2 trials only
df["vehicleType"] = df["vehicleType"].str.lower()

# -------- recompute metrics (observed) ------------------------------------
df["recomputed_correct"] = df.apply(recompute_correct, axis=1)
df["recomputed_valid"]   = df.apply(recompute_valid,   axis=1)

obs_first  = df.loc[df.type_generalization=="first-order",  "recomputed_correct"].mean()
obs_second = df.loc[df.type_generalization=="second-order", "recomputed_correct"].mean()
# *** NEW: subject-level aggregation ***
obs_valid  = df.groupby("sessionId")["recomputed_valid"].mean().mean()

print("\nObserved means")
print(f"  Raw correctness – first-order  : {obs_first:.3f}")
print(f"  Raw correctness – second-order : {obs_second:.3f}")
print(f"  Valid generalization (subj-mean) : {obs_valid:.3f}\n")

# -------- permutation ------------------------------------------------------
n_perm = 1000
null_first  = np.zeros(n_perm)
null_second = np.zeros(n_perm)
null_valid  = np.zeros(n_perm)

for i in range(n_perm):
    perm_df = df.copy()

    # shuffle key presses within participant
    for _, idx in perm_df.groupby("sessionId").groups.items():
        plans    = perm_df.loc[idx, "plan_seq"].apply(safe_str).tolist()
        lengths  = [len(p) for p in plans]
        chars    = [c for p in plans for c in p]
        if chars:
            shuffle(chars)
            pos, rebuilt = 0, []
            for L in lengths:
                rebuilt.append("".join(chars[pos:pos+L])); pos += L
            perm_df.loc[idx, "plan_seq"] = rebuilt

    perm_df["recomputed_correct"] = perm_df.apply(recompute_correct, axis=1)
    perm_df["recomputed_valid"]   = perm_df.apply(recompute_valid,   axis=1)

    null_first[i]  = perm_df.loc[perm_df.type_generalization=="first-order", "recomputed_correct"].mean()
    null_second[i] = perm_df.loc[perm_df.type_generalization=="second-order","recomputed_correct"].mean()
    # *** NEW: subject-level aggregation ***
    null_valid[i]  = perm_df.groupby("sessionId")["recomputed_valid"].mean().mean()

# -------- p-values ---------------------------------------------------------
p_first  = p_val_gt(null_first,  obs_first)
p_second = p_val_gt(null_second, obs_second)
p_valid  = p_val_gt(null_valid,  obs_valid)

print("Permutation p-values (one-tailed, obs ≥ null mean)")
print(f"  Raw correctness – first-order  : p = {p_first:.4f}")
print(f"  Raw correctness – second-order : p = {p_second:.4f}")
print(f"  Valid generalization (subj-mean) : p = {p_valid:.4f}\n")

print("Null distribution means ± SD")
print(f"  Raw correctness – first-order  : {null_first.mean():.3f} ± {null_first.std(ddof=1):.3f}")
print(f"  Raw correctness – second-order : {null_second.mean():.3f} ± {null_second.std(ddof=1):.3f}")
print(f"  Valid generalization (subj-mean) : {null_valid.mean():.3f} ± {null_valid.std(ddof=1):.3f}")

# -------- optional plot (unchanged except label) --------------------------
sns.set(style="white", font_scale=2.1)

def plot_distribution(null_dist, obs, title, p_val, color, fname):
    plt.figure()
    plt.hist(null_dist, bins=30, color=color)
    plt.axvline(obs, linewidth=4, linestyle="--", color="black")
    ymax = plt.ylim()[1]
    plt.text(obs +0.012, ymax*0.9, f"p = {p_val:.2f}", va="top", rotation=90)
    plt.title(title)
    plt.xlabel("Mean")
    plt.ylabel("Frequency")
    plt.tight_layout()
    plt.savefig(fname, dpi=300)
    plt.show()

plot_distribution(null_valid, obs_valid,
                  "Total Generalization",
                  p_valid, "gold", "perm_valid_generalization.png")

print("Saved figure: perm_valid_generalization.png")
