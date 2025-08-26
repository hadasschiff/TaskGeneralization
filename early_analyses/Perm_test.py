#!/usr/bin/env python3
"""
study2_perm_test.py   – REV-A (2025-07-13)
Permutation test for Study 2 with car / truck key mappings.

Key update:
    • Valid-generalization statistic = grand-mean of per-participant means.
"""

import sys, json, re, numpy as np, pandas as pd
from pathlib import Path
from random import shuffle
import matplotlib.pyplot as plt
import seaborn as sns

# ───────── helpers ────────────────────────────────────────────────────────
CAR_TYPES   = {"small_car", "big_car", "medium_car"}
TRUCK_TYPES = {"truck", "pickup_truck", "dump_truck"}

def allowed_keys(v):
    return {
        "small_car":   {"e","c","q","w"},
        "big_car":     {"e","c","z","x"},
        "medium_car":  {"e","c","q","w","z","x"},
        "truck":       {"t","b","n","m"},
        "pickup_truck":{"t","b","y","u"},
        "dump_truck":  {"t","b","n","m","y","u"},
    }.get(v, set())

def key_to_dir(key, v):
    if v in CAR_TYPES and key in {"e","c"}:                 # universal up/down
        return "up" if key == "e" else "down"
    if v in TRUCK_TYPES and key in {"t","b"}:
        return "up" if key == "t" else "down"
    match v:
        case "small_car":    return "left" if key=="q" else "right" if key=="w" else ""
        case "big_car":      return "left" if key=="z" else "right" if key=="x" else ""
        case "medium_car":   return "left" if key in {"q","z"} else "right" if key in {"w","x"} else ""
        case "truck":        return "left" if key=="n" else "right" if key=="m" else ""
        case "pickup_truck": return "left" if key=="y" else "right" if key=="u" else ""
        case "dump_truck":   return "left" if key in {"n","y"} else "right" if key in {"m","u"} else ""
    return ""

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

def safe_str(x):
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
    hits    = [k in allowed for k in plan]
    return np.mean(hits)

def p_val_gt(null, obs):
    return ( (null >= obs).sum() + 1 ) / (len(null) + 1)

# ───────── load data ───────────────────────────────────────────────────────
CSV = Path("game_trials_export_v1.csv")
if not CSV.exists():
    sys.exit("CSV not found: game_trials_export_v1.csv")

df = pd.read_csv(CSV)
df = df[df["phase"] == 2]   
df["vehicleType"] = df["vehicleType"].str.lower()


# -------- observed statistics ---------------------------------------------
df["recomputed_correct"] = df.apply(recompute_correct, axis=1)
df["recomputed_valid"]   = df.apply(recompute_valid,   axis=1)

obs_first  = df.loc[df.type_generalization=="first-order",  "recomputed_correct"].mean()
obs_second = df.loc[df.type_generalization=="second-order", "recomputed_correct"].mean()
# NEW: aggregate valid-generalization per participant first
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
rng = np.random.default_rng(42)

for i in range(n_perm):
    perm_df = df.copy()

    # shuffle key-presses within participant
    for _, idx in perm_df.groupby("sessionId").groups.items():
        plans   = perm_df.loc[idx, "plan_seq"].fillna("").str.lower().tolist()
        lengths = [len(p) for p in plans]
        keys    = [k for p in plans for k in p]
        rng.shuffle(keys)
        cursor, new_plans = 0, []
        for L in lengths:
            new_plans.append("".join(keys[cursor:cursor+L])); cursor += L
        perm_df.loc[idx, "plan_seq"] = new_plans

    perm_df["recomputed_correct"] = perm_df.apply(recompute_correct, axis=1)
    perm_df["recomputed_valid"]   = perm_df.apply(recompute_valid,   axis=1)

    null_first[i]  = perm_df.loc[perm_df.type_generalization=="first-order",  "recomputed_correct"].mean()
    null_second[i] = perm_df.loc[perm_df.type_generalization=="second-order", "recomputed_correct"].mean()
    # NEW: subject-level aggregation
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

# -------- quick plot for valid-generalization ------------------------------
sns.set(style="white", font_scale=2.1)

def plot_dist(null_dist, obs, p_val, fname):
    plt.figure()
    plt.hist(null_dist, bins=30, color="gold")
    plt.axvline(obs, ls="--", lw=4, color="black")
    ymax = plt.ylim()[1]
    plt.text(obs + 0.005, ymax*0.9, f"p = {p_val:.2f}", rotation=90, va="top")
    plt.title("Total Generalization")
    plt.xlabel("Mean")
    plt.ylabel("Frequency")
    plt.tight_layout()
    plt.savefig(fname, dpi=300)
    plt.show()

plot_dist(null_valid, obs_valid, p_valid, "perm_valid_generalization.png")
print("Saved figure: perm_valid_generalization.png")
