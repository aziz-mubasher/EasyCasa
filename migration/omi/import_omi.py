#!/usr/bin/env python3
"""
OMI (Agenzia delle Entrate) importer for EasyCasa.

Reads the semi-annual "Forniture dati OMI" national CSVs and emits two
load-ready files:

  omi_zone_quotes.csv  verbatim zone-level bands, all typologies (source of truth)
  omi_quotes.csv       comune-level rollup in the Phase 27 schema (derived)

Source attribution required by the Agenzia: "Agenzia Entrate - OMI".

Usage:
  python3 import_omi.py --valori QI_*_VALORI.csv --zone QI_*_ZONE.csv --out ./out
"""
from __future__ import annotations
import argparse, csv, re, statistics, sys
from pathlib import Path

# --- OMI typology code -> EasyCasa PropertyType -------------------------------
# Ordered preference: first code present in the zone wins.
TYPE_MAP: dict[str, list[str]] = {
    "apartment":  ["20", "21", "19"],   # civili -> economico -> signorili
    "house":      ["1", "22", "20"],    # ville e villini -> tipiche dei luoghi -> civili
    "villa":      ["1"],                # ville e villini
    "commercial": ["5", "6"],           # negozi -> uffici
    # 'room' and 'land' deliberately unmapped: OMI publishes neither a per-room
    # nor a terreni band. OmiPort is fail-soft, so these return null.
}

STATO_MAP = {"OTTIMO": "ottimo", "NORMALE": "normale", "SCADENTE": "scadente"}

VALORI_COLS = ["Area_territoriale","Regione","Prov","Comune_ISTAT","Comune_cat","Sez",
    "Comune_amm","Comune_descrizione","Fascia","Zona","LinkZona","Cod_Tip",
    "Descr_Tipologia","Stato","Stato_prev","Compr_min","Compr_max","Sup_NL_compr",
    "Loc_min","Loc_max","Sup_NL_loc"]
ZONE_COLS = ["Area_territoriale","Regione","Prov","Comune_ISTAT","Comune_cat","Sez",
    "Comune_amm","Comune_descrizione","Fascia","Zona_Descr","Zona","LinkZona",
    "Cod_tip_prev","Descr_tip_prev","Stato_prev","Microzona"]


def read_omi(path: Path, expected: list[str]) -> tuple[str, list[dict]]:
    """OMI files carry a one-line title banner before the real header, are
    semicolon-delimited with a trailing empty field, and are latin-1."""
    with path.open(encoding="latin-1", newline="") as fh:
        banner = fh.readline().strip()
        rdr = csv.reader(fh, delimiter=";")
        header = [h.strip() for h in next(rdr) if h.strip()]
        if header != expected:
            raise SystemExit(f"{path.name}: unexpected header\n  got {header}\n  want {expected}")
        rows = []
        for raw in rdr:
            if not any(c.strip() for c in raw):
                continue
            rows.append({k: v.strip() for k, v in zip(header, raw)})
    return banner, rows


def period_from_banner(banner: str) -> str:
    """'... Semestre 2025/2 - elaborazione del 27-LUG-26' -> '2025-H2'"""
    m = re.search(r"Semestre\s+(\d{4})/(\d)", banner)
    if not m:
        raise SystemExit(f"cannot parse period from banner: {banner!r}")
    return f"{m.group(1)}-H{m.group(2)}"


def eur_to_cents(s: str) -> int | None:
    """OMI sale values are plain integers; rents use a decimal comma."""
    s = s.strip()
    if not s:
        return None
    try:
        val = float(s.replace(".", "").replace(",", "."))
    except ValueError:
        return None
    if val <= 0:
        return None
    return int(round(val * 100))


def strip_quotes(s: str) -> str:
    return s.strip().strip("'").strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--valori", required=True, type=Path)
    ap.add_argument("--zone", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)

    vb, vrows = read_omi(a.valori, VALORI_COLS)
    zb, zrows = read_omi(a.zone, ZONE_COLS)
    period = period_from_banner(vb)
    if period != period_from_banner(zb):
        raise SystemExit("VALORI and ZONE are from different semesters")

    zmeta = {z["LinkZona"]: z for z in zrows}
    skipped = {"no_zone": 0, "no_sale_band": 0, "inverted": 0}

    # ---- zone-level, verbatim -------------------------------------------------
    zone_out = []
    for r in vrows:
        z = zmeta.get(r["LinkZona"])
        if z is None:
            skipped["no_zone"] += 1
            continue
        lo, hi = eur_to_cents(r["Compr_min"]), eur_to_cents(r["Compr_max"])
        if lo is None or hi is None:
            skipped["no_sale_band"] += 1
            continue
        if lo > hi:
            skipped["inverted"] += 1
            continue
        zone_out.append({
            "period": period,
            "link_zona": r["LinkZona"],
            "regione": r["Regione"],
            "provincia": r["Prov"].strip().upper(),
            "comune_istat": r["Comune_ISTAT"] or None,
            "comune_cat": r["Comune_cat"],
            "comune": r["Comune_descrizione"].strip().upper(),
            "zona": r["Zona"],
            "zona_descr": strip_quotes(z["Zona_Descr"]),
            "fascia": r["Fascia"],
            "microzona": z["Microzona"] or None,
            "cod_tip": r["Cod_Tip"],
            "descr_tipologia": r["Descr_Tipologia"],
            "stato": STATO_MAP.get(r["Stato"], r["Stato"].lower()),
            "prevalent": "true" if r["Stato_prev"] == "P" else "false",
            "sale_min_per_m2_cents": lo,
            "sale_max_per_m2_cents": hi,
            "sale_surface_basis": r["Sup_NL_compr"] or None,
            "rent_min_per_m2_cents": eur_to_cents(r["Loc_min"]),
            "rent_max_per_m2_cents": eur_to_cents(r["Loc_max"]),
            "rent_surface_basis": r["Sup_NL_loc"] or None,
        })

    # ---- comune-level rollup (Phase 27 omi_quotes) ---------------------------
    # Only prevalent-state rows; median across zones is the representative band.
    # A min/max envelope across all zones would be technically faithful but
    # useless for blending (Milano would span ~1.0k-16.0k EUR/m2).
    by_key: dict[tuple[str, str, str], list[tuple[int, int]]] = {}
    for z in zone_out:
        if z["prevalent"] != "true":
            continue
        for ptype, codes in TYPE_MAP.items():
            if z["cod_tip"] not in codes:
                continue
            key = (z["comune"], z["provincia"], ptype)
            by_key.setdefault(key, []).append(
                (z["sale_min_per_m2_cents"], z["sale_max_per_m2_cents"], codes.index(z["cod_tip"]))
            )

    quotes_out = []
    for (comune, prov, ptype), vals in by_key.items():
        best = min(v[2] for v in vals)          # highest-preference code present
        sel = [(lo, hi) for lo, hi, rank in vals if rank == best]
        quotes_out.append({
            "comune": comune,
            "provincia": prov,
            "type": ptype,
            "min_per_m2_cents": int(statistics.median(v[0] for v in sel)),
            "max_per_m2_cents": int(statistics.median(v[1] for v in sel)),
            "period": period,
            "basis": "zone_median",
            "zones_used": len(sel),
        })

    def dump(name: str, rows: list[dict]) -> None:
        p = a.out / name
        with p.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
        print(f"  {name}: {len(rows):,} rows -> {p}")

    print(f"period={period}  source=\"Agenzia Entrate - OMI\"")
    dump("omi_zone_quotes.csv", zone_out)
    dump("omi_quotes.csv", quotes_out)
    print(f"skipped: {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
