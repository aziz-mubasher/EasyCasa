from app.providers.embeddings import HashingEmbedder, cosine


def test_hashing_embedder_deterministic_and_dim():
    e = HashingEmbedder(dim=1536)
    a = e.embed(["casa con giardino a Milano"])[0]
    b = e.embed(["casa con giardino a Milano"])[0]
    assert len(a) == 1536
    assert a == b  # deterministic


def test_similar_text_closer_than_unrelated():
    e = HashingEmbedder(dim=512)
    base = e.embed(["appartamento luminoso vicino al centro"])[0]
    near = e.embed(["appartamento luminoso in centro"])[0]
    far = e.embed(["capannone industriale con ampio piazzale"])[0]
    assert cosine(base, near) > cosine(base, far)
