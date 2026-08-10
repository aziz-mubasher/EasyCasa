"""Perceptual image hashing (dHash + pHash) as 64-bit integers.

Pure functions only — no I/O, no DB, no network. See ``matching.py`` for the
Hamming-distance-based classification that consumes these hashes and
``docs/ai.md`` / EC-S-T12 for the product context.

Exact content-addressing (same-account re-uploads of byte-identical files)
is handled elsewhere in the media pipeline (see ``docs/media-hosting.md``).
This module only answers "do these two images *look* alike".
"""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

import numpy as np
from PIL import Image

DHASH_SIZE = 8
"""Side length of the dHash grid; yields DHASH_SIZE * DHASH_SIZE = 64 bits."""

PHASH_SIZE = 8
"""Side length of the low-frequency DCT block kept for pHash; 8*8 = 64 bits."""

PHASH_HIGHFREQ_FACTOR = 4
"""pHash is computed from a (PHASH_SIZE * factor)^2 DCT before truncating to
the low-frequency corner. A factor of 4 (32x32) is the standard choice used
by most perceptual-hash implementations and balances noise rejection against
sensitivity to real detail."""

HASH_BITS = 64
"""Both dHash and pHash produced by this module are 64-bit integers."""

BUCKET_BITS = 16
"""Number of high-order dHash bits used as a DB-friendly bucket key."""


@dataclass(frozen=True, slots=True)
class ImageHashes:
    """The perceptual fingerprints computed for a single image."""

    dhash: int
    phash: int

    def __post_init__(self) -> None:
        for name, value in (("dhash", self.dhash), ("phash", self.phash)):
            if not (0 <= value < (1 << HASH_BITS)):
                raise ValueError(f"{name} must be a {HASH_BITS}-bit unsigned int, got {value!r}")


def _load_grayscale(image_bytes: bytes) -> Image.Image:
    with Image.open(BytesIO(image_bytes)) as img:
        img.load()
        return img.convert("L")


def _bits_to_int(bits: np.ndarray) -> int:
    """Pack a flat boolean array (MSB first) into a Python int."""
    value = 0
    for bit in bits.flat:
        value = (value << 1) | int(bool(bit))
    return value


def dhash(image_bytes: bytes, hash_size: int = DHASH_SIZE) -> int:
    """Difference hash: compares brightness of horizontally-adjacent pixels
    on a shrunk (hash_size+1) x hash_size grid. Robust to resizing, mild
    recompression, and small brightness shifts; sensitive to mirroring and
    heavy cropping (both change the gradient pattern)."""
    gray = _load_grayscale(image_bytes)
    resized = gray.resize((hash_size + 1, hash_size), Image.LANCZOS)
    pixels = np.asarray(resized, dtype=np.int16)
    diff = pixels[:, 1:] > pixels[:, :-1]
    return _bits_to_int(diff)


def _dct_matrix(n: int) -> np.ndarray:
    """Unnormalized DCT-II basis matrix. Normalization constants are
    irrelevant here because pHash only compares each coefficient against the
    median of its own low-frequency block, and this basis is applied
    consistently to every image."""
    i = np.arange(n).reshape(1, -1)
    k = np.arange(n).reshape(-1, 1)
    return np.cos(np.pi / n * (i + 0.5) * k)


def _dct2(block: np.ndarray) -> np.ndarray:
    c = _dct_matrix(block.shape[0])
    return c @ block @ c.T


def phash(
    image_bytes: bytes,
    hash_size: int = PHASH_SIZE,
    highfreq_factor: int = PHASH_HIGHFREQ_FACTOR,
) -> int:
    """Perceptual hash: 2D DCT of a shrunk grayscale image, keeping the
    hash_size x hash_size low-frequency corner and thresholding each
    coefficient against the block median. More robust than dHash to mirroring
    and small geometric changes, but slightly more expensive to compute."""
    img_size = hash_size * highfreq_factor
    gray = _load_grayscale(image_bytes)
    resized = gray.resize((img_size, img_size), Image.LANCZOS)
    pixels = np.asarray(resized, dtype=np.float64)
    dct = _dct2(pixels)
    low_freq = dct[:hash_size, :hash_size]
    median = np.median(low_freq)
    bits = low_freq > median
    return _bits_to_int(bits)


def compute_hashes(image_bytes: bytes) -> ImageHashes:
    """Compute both perceptual hashes for a single image's raw bytes."""
    return ImageHashes(dhash=dhash(image_bytes), phash=phash(image_bytes))


def hamming_distance(a: int, b: int) -> int:
    """Number of differing bits between two same-width integer hashes."""
    return (a ^ b).bit_count()


def bucket_key(dhash_value: int, bits: int = BUCKET_BITS) -> int:
    """Top `bits` bits of a dHash, used as a coarse DB index/shard key so a
    duplicate-candidate lookup can filter to a small bucket before running
    full Hamming-distance comparisons within it."""
    return dhash_value >> (HASH_BITS - bits)
