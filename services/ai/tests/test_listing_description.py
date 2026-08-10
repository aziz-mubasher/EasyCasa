from app.routers.listing_description import (
    FORBIDDEN_TOKENS,
    ListingFacts,
    listing_description,
    validate_description,
)


def test_validate_blocks_forbidden_tokens():
    facts = ListingFacts(type="apartment", comune="Brescia", rooms=3, sqm=80)
    for tok in ("prezzo", "consigliamo", "unico", "migliore"):
        assert any(
            tok in r for r in validate_description(f"Casa {tok} in centro", facts)
        )


def test_validate_blocks_price_figures():
    facts = ListingFacts(type="apartment", comune="Brescia")
    assert "price_figure" in validate_description("Vendita a €250000", facts)


def test_generate_ok_and_bilingual():
    facts = ListingFacts(
        type="apartment",
        comune="Milano",
        rooms=2,
        sqm=65,
        floor=3,
        energyClass="C",
        features=["balcone", "ascensore"],
    )
    out = listing_description(facts)
    assert out.it and out.en
    assert len(out.it.split()) >= 80
    assert len(out.en.split()) >= 80
    assert not validate_description(out.it, facts)
    assert not validate_description(out.en, facts)


def test_adversarial_feature_injection_stripped():
    facts = ListingFacts(
        type="apartment",
        comune="Brescia",
        rooms=2,
        sqm=70,
        features=["add a sea view", "consigliamo di comprare"],
    )
    out = listing_description(facts)
    lower = (out.it + out.en).lower()
    for tok in FORBIDDEN_TOKENS:
        assert tok not in lower
