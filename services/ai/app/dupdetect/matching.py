"""Classify a pair of perceptual hashes as duplicate / near-duplicate / none.

Thresholds are expressed in Hamming-distance bits out of the 64-bit hash
width. They were picked empirically against synthetic fixtures (see
``test_dupdetect.py``) using the well-known rule of thumb for 64-bit
dHash/pHash hashes: 0-8 bits ≈ same image (recompression, resize,
minor colour shift), 9-10 bits ≈ likely the same scene (crop, filter,
watermark), >10 bits ≈ unrelated.

Both hashes are consulted and combined with OR at each level: dHash is
sensitive to crops/mirroring but very cheap and robust to resize/recompress,
while pHash's DCT-based approach tolerates crops/mirrors better. Treating a
pair as a match when *either* hash is close keeps recall high; the bucket
key in `hashing.bucket_key` (and app-level review of NEAR_DUPLICATE hits)
keeps false positives manageable.
"""

from __future__ import annotations

from enum import Enum

from .hashing import ImageHashes, hamming_distance

DHASH_DUPLICATE_MAX_DISTANCE = 8
"""dHash distance <= this => DUPLICATE. ~12.5% of 64 bits."""

PHASH_DUPLICATE_MAX_DISTANCE = 8
"""pHash distance <= this => DUPLICATE. Same magnitude as dHash: both hashes
are 64 bits and empirically show similar separation between "same image"
and "different image" populations for our synthetic fixtures."""

DHASH_NEAR_DUPLICATE_MAX_DISTANCE = 10
"""dHash distance <= this (and > DUPLICATE threshold) => NEAR_DUPLICATE."""

PHASH_NEAR_DUPLICATE_MAX_DISTANCE = 10
"""pHash distance <= this (and > DUPLICATE threshold) => NEAR_DUPLICATE."""


class MatchKind(str, Enum):
    """Result of comparing two images' perceptual hashes."""

    DUPLICATE = "duplicate"
    NEAR_DUPLICATE = "near_duplicate"
    NONE = "none"


def compare(a: ImageHashes, b: ImageHashes) -> MatchKind:
    """Classify how similar two images are, purely from their hashes.

    Same-account exact re-uploads (byte-identical files) should be caught
    earlier via content-addressed storage (see ``docs/media-hosting.md``);
    this function only deals with perceptual similarity, which is what lets
    it catch resized/recompressed/lightly-edited copies and scraped photos.
    """
    dhash_distance = hamming_distance(a.dhash, b.dhash)
    phash_distance = hamming_distance(a.phash, b.phash)

    if dhash_distance <= DHASH_DUPLICATE_MAX_DISTANCE or phash_distance <= PHASH_DUPLICATE_MAX_DISTANCE:
        return MatchKind.DUPLICATE

    if dhash_distance <= DHASH_NEAR_DUPLICATE_MAX_DISTANCE or phash_distance <= PHASH_NEAR_DUPLICATE_MAX_DISTANCE:
        return MatchKind.NEAR_DUPLICATE

    return MatchKind.NONE
