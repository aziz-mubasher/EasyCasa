"""EC-S-T12 — Duplicate/scraped-image detection (perceptual only).

Public API:

    compute_hashes(image_bytes: bytes) -> ImageHashes
    compare(a: ImageHashes, b: ImageHashes) -> MatchKind
    hamming_distance(a: int, b: int) -> int
    bucket_key(dhash: int) -> int

This package is intentionally dependency-light (Pillow + numpy only) and has
no FastAPI router — it's meant to be called from listing-photo-upload code
(Nest `media.service` or a future AI-service endpoint) rather than exposed
as its own HTTP surface. See ``docs/ec-s-roadmap.md`` (T12) and
``docs/media-hosting.md`` for where this fits in the photo pipeline.
"""

from .hashing import (
    BUCKET_BITS,
    DHASH_SIZE,
    HASH_BITS,
    PHASH_HIGHFREQ_FACTOR,
    PHASH_SIZE,
    ImageHashes,
    bucket_key,
    compute_hashes,
    dhash,
    hamming_distance,
    phash,
)
from .matching import (
    DHASH_DUPLICATE_MAX_DISTANCE,
    DHASH_NEAR_DUPLICATE_MAX_DISTANCE,
    PHASH_DUPLICATE_MAX_DISTANCE,
    PHASH_NEAR_DUPLICATE_MAX_DISTANCE,
    MatchKind,
    compare,
)

__all__ = [
    "ImageHashes",
    "MatchKind",
    "compute_hashes",
    "compare",
    "hamming_distance",
    "bucket_key",
    "dhash",
    "phash",
    "DHASH_SIZE",
    "PHASH_SIZE",
    "PHASH_HIGHFREQ_FACTOR",
    "HASH_BITS",
    "BUCKET_BITS",
    "DHASH_DUPLICATE_MAX_DISTANCE",
    "PHASH_DUPLICATE_MAX_DISTANCE",
    "DHASH_NEAR_DUPLICATE_MAX_DISTANCE",
    "PHASH_NEAR_DUPLICATE_MAX_DISTANCE",
]
