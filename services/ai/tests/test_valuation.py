from app.services.valuation import Comparable, compute_valuation


def test_valuation_median_and_range():
    comps = [Comparable(price=p, size_sqm=100) for p in (200_000, 250_000, 300_000, 350_000)]
    res = compute_valuation(comps, size_sqm=100)
    assert res.comparables == 4
    assert res.estimate == 275_000  # median €/m² (2500 & 3000 -> 2750) * 100
    assert res.low is not None and res.high is not None
    assert res.low <= res.estimate <= res.high


def test_valuation_no_comps():
    res = compute_valuation([], size_sqm=80)
    assert res.estimate is None
    assert res.confidence == "none"
