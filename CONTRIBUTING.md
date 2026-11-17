# Contributing

Only maintainers (see `.github/CODEOWNERS`) can change `data/`. Everyone else suggests changes:

1. **Issue:** open a "Suggest a change" issue and fill in code, Norwegian and English terms.
2. **Pull request:** fork, edit `data/types.csv` or `data/plant_template.json`, and open a PR.

Every PR runs `python scripts/validate.py` (unique codes, valid parents, `no` and `en` present, no definition-like columns, schema). Run it locally first (`pip install jsonschema`). Merging needs approval from 2-3 CODEOWNERS, who also approve the translations.

## Terminology guideline

- Every term needs both Norwegian (`no`) and English (`en`). Extra languages are optional (`label_sv`, `label_nn`, ...).
- Use consistent Norwegian sector terms; check existing entries before adding a new word.
- Terms are short labels in your own words. **Never copy wording, definitions or descriptions from IEC/ISO/RDS standards**, Short descriptions go in the optional `desc_no` / `desc_en` columns of `types.csv`, written in your own words (type definitions are not standardised). No other definition-like columns are allowed.

## Local preview

```
python scripts/build_site.py
python -m http.server -d site
```

## Edit mode on the site

Click **Edit** in the site header to add, change or delete entries in the type table and plant template. Changes stay in your browser (a draft). Use **Submit for review** to download the changed files and open a prefilled issue; attach the files there. Maintainers review codes and translations before merging. Both NO and EN terms are required.
