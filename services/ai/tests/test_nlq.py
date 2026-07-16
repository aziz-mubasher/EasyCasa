from app.services.nlq import parse_query

REGIONS = [("lombardia", "Lombardia"), ("toscana", "Toscana")]


def test_rent_and_price_it():
    p = parse_query("bilocale in affitto a Milano sotto 1.200 al mese", REGIONS)
    assert p.filters.transaction_type == "rent"
    assert p.filters.min_bedrooms == 2
    assert p.filters.max_price == 1200


def test_renovatable_and_region_en():
    p = parse_query("renovatable farmhouse in Toscana under 150k", REGIONS)
    assert p.filters.category_slug == "renovatable"
    assert p.filters.region_slug == "toscana"
    assert p.filters.max_price == 150000


def test_sale_million_es():
    p = parse_query("comprar villa más de 1,5 millones en Lombardia", REGIONS)
    assert p.filters.transaction_type == "sale"
    assert p.filters.min_price == 1500000
    assert p.filters.region_slug == "lombardia"
