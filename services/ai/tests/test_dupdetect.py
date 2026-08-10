"""Tests for app.dupdetect (EC-S-T12 — duplicate/scraped-image detection).

All fixtures are generated in-memory with Pillow; no real listing photos are
needed. Distances quoted in comments were measured once against these exact
fixtures (see the empirical exploration in the PR description) and are kept
well clear of the DUPLICATE (<=8) / NEAR_DUPLICATE (<=10) boundaries so the
suite doesn't flake on unrelated Pillow/numpy version bumps.
"""

from __future__ import annotations

import io

import numpy as np
import pytest
from PIL import Image, ImageDraw

from app.dupdetect import (
    HASH_BITS,
    ImageHashes,
    MatchKind,
    bucket_key,
    compare,
    compute_hashes,
    hamming_distance,
)
from app.dupdetect.matching import (
    DHASH_DUPLICATE_MAX_DISTANCE,
    DHASH_NEAR_DUPLICATE_MAX_DISTANCE,
)

MAX_HASH = (1 << HASH_BITS) - 1


def _png_bytes(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def _jpeg_bytes(image: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def _house_photo(size: int = 256) -> Image.Image:
    """A synthetic 'listing photo'-like scene: sky, roof, facade, door."""
    image = Image.new("RGB", (size, size), color=(135, 206, 235))
    draw = ImageDraw.Draw(image)
    draw.rectangle([size * 0.1, size * 0.4, size * 0.9, size * 0.95], fill=(180, 140, 100))
    draw.polygon(
        [(size * 0.05, size * 0.4), (size * 0.5, size * 0.15), (size * 0.95, size * 0.4)],
        fill=(120, 40, 40),
    )
    draw.rectangle([size * 0.4, size * 0.6, size * 0.6, size * 0.95], fill=(60, 30, 10))
    return image


def _asymmetric_block(size: int = 256) -> Image.Image:
    """A scene with a large feature confined to one side, so mirroring
    genuinely changes the visible content (unlike a bilaterally-symmetric
    scene, where a mirrored copy legitimately looks the same)."""
    image = Image.new("RGB", (size, size), color=(230, 230, 230))
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 0, size * 0.33, size], fill=(20, 20, 20))
    draw.rectangle([size * 0.4, size * 0.6, size * 0.6, size * 0.8], fill=(90, 60, 30))
    return image


def _checkerboard(size: int = 256, cell: int = 16) -> Image.Image:
    arr = np.zeros((size, size), dtype=np.uint8)
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            if ((x // cell) + (y // cell)) % 2 == 0:
                arr[y : y + cell, x : x + cell] = 255
    return Image.fromarray(arr, mode="L").convert("RGB")


def _gradient(size: int = 256) -> Image.Image:
    row = np.linspace(0, 255, size, dtype=np.uint8)
    arr = np.tile(row, (size, 1))
    return Image.fromarray(arr, mode="L").convert("RGB")


def _random_noise(size: int = 256, seed: int = 0) -> Image.Image:
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 256, size=(size, size, 3), dtype=np.uint8)
    return Image.fromarray(arr, mode="RGB")


class TestHammingDistance:
    def test_identical_ints_have_zero_distance(self) -> None:
        assert hamming_distance(0b1010, 0b1010) == 0

    def test_all_bits_differ_at_max_distance(self) -> None:
        assert hamming_distance(0, MAX_HASH) == HASH_BITS

    def test_single_bit_flip_is_distance_one(self) -> None:
        assert hamming_distance(0b1000, 0b1001) == 1

    def test_distance_is_symmetric(self) -> None:
        a, b = 0x1234_5678_9ABC_DEF0, 0x0FED_CBA9_8765_4321
        assert hamming_distance(a, b) == hamming_distance(b, a)


class TestBucketKey:
    def test_bucket_key_is_top_16_bits(self) -> None:
        dhash = 0xABCD_0000_0000_0000
        assert bucket_key(dhash) == 0xABCD

    def test_bucket_key_stays_within_16_bits(self) -> None:
        for value in (0, MAX_HASH, 0x1, 0x8000_0000_0000_0000):
            assert 0 <= bucket_key(value) <= 0xFFFF

    def test_bucket_key_ignores_low_48_bits(self) -> None:
        base = 0x1234_0000_0000_0000
        assert bucket_key(base) == bucket_key(base | 0xFFFF_FFFF_FFFF)

    def test_bucket_key_groups_near_identical_dhashes_together(self) -> None:
        # Two dHashes that differ only in low-order bits (e.g. minor JPEG
        # noise) should land in the same DB bucket.
        a = 0x1234_0001
        b = 0x1234_0002
        assert bucket_key(a) == bucket_key(b)


class TestComputeHashes:
    def test_returns_64_bit_ints_in_range(self) -> None:
        hashes = compute_hashes(_png_bytes(_house_photo()))
        assert isinstance(hashes, ImageHashes)
        assert 0 <= hashes.dhash <= MAX_HASH
        assert 0 <= hashes.phash <= MAX_HASH

    def test_deterministic_for_identical_bytes(self) -> None:
        data = _png_bytes(_gradient())
        assert compute_hashes(data) == compute_hashes(data)

    def test_different_content_produces_different_hashes(self) -> None:
        a = compute_hashes(_png_bytes(_checkerboard()))
        b = compute_hashes(_png_bytes(_random_noise(seed=1)))
        assert a != b

    def test_rejects_out_of_range_hash_values(self) -> None:
        with pytest.raises(ValueError):
            ImageHashes(dhash=MAX_HASH + 1, phash=0)


class TestThresholdBoundaries:
    """Boundary checks against hand-constructed ints, independent of any
    real image, so the DUPLICATE/NEAR_DUPLICATE/NONE cutpoints themselves
    are pinned regardless of Pillow/numpy resizing behaviour."""

    def test_distance_at_duplicate_threshold_is_duplicate(self) -> None:
        distance = DHASH_DUPLICATE_MAX_DISTANCE
        a = ImageHashes(dhash=0, phash=0)
        b = ImageHashes(dhash=(1 << distance) - 1, phash=MAX_HASH)
        assert hamming_distance(a.dhash, b.dhash) == distance
        assert compare(a, b) == MatchKind.DUPLICATE

    def test_distance_between_thresholds_is_near_duplicate(self) -> None:
        distance = DHASH_NEAR_DUPLICATE_MAX_DISTANCE
        assert distance > DHASH_DUPLICATE_MAX_DISTANCE
        a = ImageHashes(dhash=0, phash=0)
        b = ImageHashes(dhash=(1 << distance) - 1, phash=MAX_HASH)
        assert hamming_distance(a.dhash, b.dhash) == distance
        assert compare(a, b) == MatchKind.NEAR_DUPLICATE

    def test_distance_beyond_near_threshold_is_none(self) -> None:
        distance = DHASH_NEAR_DUPLICATE_MAX_DISTANCE + 1
        a = ImageHashes(dhash=0, phash=0)
        b = ImageHashes(dhash=(1 << distance) - 1, phash=MAX_HASH)
        assert hamming_distance(a.dhash, b.dhash) == distance
        assert compare(a, b) == MatchKind.NONE

    def test_both_hashes_far_but_one_close_is_still_duplicate(self) -> None:
        # OR-combination: a close pHash alone is enough, even if dHash is
        # wildly different (e.g. a heavy crop that shifts every pixel pair
        # but preserves the DCT low-frequency structure).
        a = ImageHashes(dhash=0, phash=0)
        b = ImageHashes(dhash=MAX_HASH, phash=0)
        assert compare(a, b) == MatchKind.DUPLICATE


class TestMatchClassificationOnRealImages:
    def test_identical_bytes_are_duplicate(self) -> None:
        data = _png_bytes(_house_photo())
        assert compare(compute_hashes(data), compute_hashes(data)) == MatchKind.DUPLICATE

    def test_resized_copy_is_duplicate(self) -> None:
        original = _house_photo(size=512)
        resized = original.resize((128, 128), Image.LANCZOS)
        a = compute_hashes(_png_bytes(original))
        b = compute_hashes(_png_bytes(resized))
        assert compare(a, b) == MatchKind.DUPLICATE

    def test_recompressed_jpeg_is_duplicate(self) -> None:
        original = _house_photo()
        a = compute_hashes(_jpeg_bytes(original, quality=95))
        b = compute_hashes(_jpeg_bytes(original, quality=60))
        assert compare(a, b) == MatchKind.DUPLICATE

    def test_grayscale_conversion_is_duplicate(self) -> None:
        # Both hashes operate on luma only, so an all-else-equal grayscale
        # re-export of the same photo should still register as the same image.
        original = _house_photo()
        gray_export = original.convert("L").convert("RGB")
        a = compute_hashes(_png_bytes(original))
        b = compute_hashes(_png_bytes(gray_export))
        assert compare(a, b) == MatchKind.DUPLICATE

    def test_slightly_cropped_image_is_near_duplicate(self) -> None:
        # A scraper who crops off ~8% along the bottom-right (e.g. to remove
        # a watermark or agency logo) is the canonical NEAR_DUPLICATE case:
        # same scene, imperfect match — too different for DUPLICATE, too
        # similar for NONE.
        size = 256
        original = _house_photo(size=size)
        pct = 0.08
        cropped = original.crop((0, 0, int(size * (1 - pct)), int(size * (1 - pct)))).resize(
            (size, size), Image.LANCZOS
        )
        a = compute_hashes(_png_bytes(original))
        b = compute_hashes(_png_bytes(cropped))
        assert compare(a, b) == MatchKind.NEAR_DUPLICATE

    def test_moderately_cropped_image_is_none(self) -> None:
        size = 256
        original = _house_photo(size=size)
        pct = 0.2
        cropped = original.crop(
            (int(size * pct), int(size * pct), int(size * (1 - pct)), int(size * (1 - pct)))
        ).resize((size, size), Image.LANCZOS)
        a = compute_hashes(_png_bytes(original))
        b = compute_hashes(_png_bytes(cropped))
        assert compare(a, b) == MatchKind.NONE

    def test_distinct_synthetic_patterns_are_none(self) -> None:
        a = compute_hashes(_png_bytes(_checkerboard()))
        b = compute_hashes(_png_bytes(_gradient()))
        assert compare(a, b) == MatchKind.NONE

    def test_unrelated_random_noise_images_are_none(self) -> None:
        a = compute_hashes(_png_bytes(_random_noise(seed=1)))
        b = compute_hashes(_png_bytes(_random_noise(seed=2)))
        assert compare(a, b) == MatchKind.NONE


class TestAdversarialEdgeCases:
    def test_mirrored_asymmetric_image_is_not_duplicate(self) -> None:
        # A horizontally-flipped copy of a scene with real left/right
        # asymmetry is genuinely different content (e.g. a car swapped from
        # the left side of a driveway to the right) — both hashes should
        # pick that up rather than falsely flagging it as a re-upload.
        original = _asymmetric_block()
        mirrored = original.transpose(Image.FLIP_LEFT_RIGHT)
        a = compute_hashes(_png_bytes(original))
        b = compute_hashes(_png_bytes(mirrored))
        assert compare(a, b) == MatchKind.NONE

    def test_tiny_one_pixel_image_does_not_crash(self) -> None:
        hashes = compute_hashes(_png_bytes(Image.new("RGB", (1, 1), (10, 10, 10))))
        assert isinstance(hashes, ImageHashes)

    def test_solid_color_images_of_different_sizes_are_duplicate(self) -> None:
        # Two flat, featureless images of the same colour have no gradient
        # or frequency content to distinguish — both hash to all-zero and
        # should be treated as the same "image".
        a = compute_hashes(_png_bytes(Image.new("RGB", (200, 200), (200, 50, 50))))
        b = compute_hashes(_png_bytes(Image.new("RGB", (64, 64), (200, 50, 50))))
        assert compare(a, b) == MatchKind.DUPLICATE

    def test_corrupt_bytes_raise_instead_of_silently_matching(self) -> None:
        with pytest.raises(Exception):
            compute_hashes(b"not an image")
