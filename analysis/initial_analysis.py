#!/usr/bin/env python3
"""
initial_analysis.py
───────────────────
• Uses proportion‐correct (pcorrect) so first/second order are comparable.
• Prints correlation between WORRY and SOMATIC.
• New “danger-aligned mistake” analysis:
    – For every *invalid* key-press we decide whether the key is of the
      same broad category (car-type vs truck-type) as the participant’s
      dangerous_vehicle.
    – We do this separately for           • large (UP/DOWN) mistakes
                                          • fine  (LEFT/RIGHT) mistakes
    – Each mistake gives +1 if it matches the dangerous category, –1
      otherwise.  We aggregate to the participant level and report means.
"""

import sys, json, warnings
import numpy as np
import pandas as pd
from   scipy.stats import ttest_ind, ttest_1samp, pearsonr
import statsmodels.formula.api as smf

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "game_trials_export.csv"

# ─── 1. Load & basic cleaning ──────────────────────────────────────────────
df = pd.read_csv(CSV_PATH)

num_cols = ["correctness_generalization", "valid_generalization",
            "worry", "somatic_anxiety",
            "bias_second_order_valid", "bias_second_order_correct"]
df[num_cols] = df[num_cols].apply(pd.to_numeric, errors="coerce")

# ─── 1-b. Proportion-correct (pcorrect) ────────────────────────────────────
scale = np.where(df.type_generalization == "first-order", 4,
         np.where(df.type_generalization == "second-order", 2, np.nan))
df["pcorrect"] = df["correctness_generalization"] / scale     # 0-1

# ─── 2. Descriptives & t-test (pcorrect) ───────────────────────────────────
overall_mean = df["pcorrect"].mean()
by_order = df.groupby("type_generalization")["pcorrect"].mean()

print("=== MEAN proportion-correct ===")
print(f"Overall                : {overall_mean:.3f}")
for order, m in by_order.items():
    print(f"{order:16s}: {m:.3f}")
print()

first  = df.loc[df.type_generalization == "first-order",  "pcorrect"].dropna()
second = df.loc[df.type_generalization == "second-order", "pcorrect"].dropna()
if len(first) > 1 and len(second) > 1:
    tt = ttest_ind(first, second, equal_var=False)
    print("=== t-test: pcorrect (first vs second) ===")
    print(f"t = {tt.statistic:.3f}, p = {tt.pvalue:.4f}\n")
else:
    print("=== t-test skipped: not enough data ===\n")

# ─── 3. Correlations ───────────────────────────────────────────────────────
part = (
    df.groupby("sessionId")
      .agg(pcorrect=("pcorrect", "mean"),
           worry    =("worry",   "first"),
           somatic  =("somatic_anxiety", "first"))
      .dropna()
)
if len(part) > 1:
    r_pw, p_pw = pearsonr(part["pcorrect"], part["worry"])
    r_ps, p_ps = pearsonr(part["pcorrect"], part["somatic"])
    r_ws, p_ws = pearsonr(part["worry"],    part["somatic"])     # NEW
    print("=== Participant-level correlations ===")
    print(f"pcorrect ↔ worry           : r = {r_pw:.3f}, p = {p_pw:.4f}")
    print(f"pcorrect ↔ somatic_anxiety : r = {r_ps:.3f}, p = {p_ps:.4f}")
    print(f"worry    ↔ somatic_anxiety : r = {r_ws:.3f}, p = {p_ws:.4f}\n")
else:
    print("=== Correlation skipped: <2 participants ===\n")

# ─── 4. “Danger-aligned” mistake analysis  ────────────────────────────────
# Helper key sets
car_up   = {"e", "c"}
all_truck_up = {"t", "b"}
small_car_lr   = {"q", "w"}
big_car_lr= {"z", "x"}
truck_lr = {"n", "m"}
pickup_truck_lr={"y","u"}
# quick utility
def allowed_keys(v):
    if   v == "small_car":   return car_up | car_lr
    elif v == "big_car":     return car_up | car_lr
    elif v == "medium_car":  return car_up | car_lr
    elif v == "truck":       return truck_up | truck_lr
    elif v == "pickup_truck":return truck_up | truck_lr
    elif v == "dump_truck":  return truck_up | truck_lr
    else:                    return set()

agg = {}   # sessionId → dict with tallies
for _, row in df.iterrows():
    # dangerous category for this participant
    dang = str(row.dangerous_vehicle).lower()
    dang_cat = "truck" if "truck" in dang else ("car" if "car" in dang else None)
    if dang_cat is None: continue

    vehicle = row.vehicleType
    if pd.isna(vehicle): continue
    vehicle = str(vehicle).lower()

    # raw keys for this trial
    keys = str(row.raw_input_seq).lower()
    if not keys: continue

    allowed = allowed_keys(vehicle)
    for k in keys:
        if k not in allowed:                                     # it's a mistake
            # classify mistake type
            if k in car_up | truck_up:
                domain = "updown"
                match  = (k in truck_up) if dang_cat=="truck" else (k in car_up)
            elif k in car_lr | truck_lr:
                domain = "leftright"
                match  = (k in truck_lr) if dang_cat=="truck" else (k in car_lr)
            else:
                continue  # unknown key, skip

            sid = row.sessionId
            agg.setdefault(sid, {"updown":0, "leftright":0})
            agg[sid][domain] +=  1 if match else -1

# Turn dict → DataFrame
mistake_df = pd.DataFrame.from_dict(agg, orient="index")
if mistake_df.empty:
    print("=== No mistakes detected – skipping danger-alignment analysis ===")
else:
    for domain in ["updown", "leftright"]:
        mean_score = mistake_df[domain].mean()
        t_dom, p_dom = ttest_1samp(mistake_df[domain], 0.0, nan_policy="omit")
        print(f"=== Danger-aligned mistakes: {domain} ===")
        print(f"Mean score ( +1 aligned / –1 opposed ) : {mean_score:.3f}")
        print(f"t vs 0: t = {t_dom:.3f}, p = {p_dom:.4f}\n")

# ─── 5. Optional regression on pcorrect (second-order only) ────────────────
sec = df[df.type_generalization == "second-order"].copy()
sec["is_dangerous_trial"] = (
    sec["vehicleType"].str.lower() == sec["dangerous_vehicle"].str.lower()
)
sec["danger"] = sec["is_dangerous_trial"].astype(int)

if sec.shape[0] > 30:
    model = smf.ols("pcorrect ~ worry + somatic_anxiety + danger", data=sec).fit()
    print("=== OLS on second-order pcorrect (worry, somatic, danger) ===")
    print(model.summary().tables[1])
else:
    print("=== OLS skipped: not enough second-order rows (≤30) ===")
