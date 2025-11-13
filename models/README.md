# Model Directory

This directory contains machine learning models used by MaintSight.

## XGBoost Maintenance Model

The maintenance analyzer agent requires an XGBoost model in JSON format to predict maintenance risk scores.

### Converting .pkl to JSON

If you have an existing XGBoost model in `.pkl` format, you need to convert it to JSON:

```bash
# Install required Python packages
pip install xgboost joblib numpy

# Run the conversion script
python scripts/convert_model_to_json.py \
  --input path/to/your/model.pkl \
  --output models/maintenance_model.json
```

### Model Format

The expected JSON format includes:

- `model_data`: The XGBoost tree structure
- `feature_names`: List of feature names in order
- `risk_thresholds`: Risk category thresholds

### Feature Order

The model expects features in this order:

1. `lines_added`
2. `lines_deleted`
3. `prs` (number of commits)
4. `unique_authors`
5. `bug_prs` (bug fix commits)
6. `churn` (total lines changed)
7. `lines_per_pr`
8. `lines_per_author`
9. `add_del_ratio`
10. `deletion_ratio`
11. `bug_density`
12. `collaboration_complexity`

### Risk Categories

- **no-risk** (0.00-0.22): Well-maintained code
- **low-risk** (0.22-0.47): Minor maintenance needs
- **medium-risk** (0.47-0.65): Moderate attention required
- **high-risk** (0.65-1.00): Critical maintenance needed
