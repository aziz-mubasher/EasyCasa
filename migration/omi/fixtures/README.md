# Lombardia OMI fixture (CI)

Slice of the H2 2025 national seed for EC-2 CI:

- `omi_zone_quotes.csv` — 25,271 zone rows (`regione=LOMBARDIA`)
- `omi_quotes.csv` — 5,848 comune medians for Lombardia provinces
- `load.sql` / `verify.sql` — same upsert semantics as parent; reduced expectations

Regenerate from national gz (local, not CI):

```bash
# from migration/omi with national gz present
python3 - <<'PY'
# see EC-2 agent notes / docs/ec-2-omi-load-rehearsal.md
PY
```

Milano B12 + comune apartment smoke tests are included.
