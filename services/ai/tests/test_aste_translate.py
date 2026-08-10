"""EC-24 — translate contract tests (mocked LLM)."""

from __future__ import annotations

import json

import pytest

from app.schemas_aste import TranslateRequest
from app.services import aste_translate
from app.services.aste_translate import run_translate
from app.settings import Settings


def test_translate_requires_openai() -> None:
    s = Settings(CHAT_PROVIDER="none", OPENAI_API_KEY="")
    with pytest.raises(RuntimeError, match="translate_unavailable"):
        run_translate(TranslateRequest(texts=["prezzo base"], target_lang="en"), settings=s)


def test_translate_parses_llm_json(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_complete(s, system, user):  # noqa: ARG001
        return json.dumps({"translations": ["starting price (prezzo base)"]})

    monkeypatch.setattr(aste_translate, "_complete", fake_complete)
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    out = run_translate(
        TranslateRequest(texts=["prezzo base"], target_lang="en"),
        settings=s,
    )
    assert out == ["starting price (prezzo base)"]


def test_translate_pads_short_response(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_complete(s, system, user):  # noqa: ARG001
        return json.dumps({"translations": ["one"]})

    monkeypatch.setattr(aste_translate, "_complete", fake_complete)
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    out = run_translate(
        TranslateRequest(texts=["a", "b"], target_lang="en"),
        settings=s,
    )
    assert out == ["one", ""]


def test_translate_empty() -> None:
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    assert run_translate(TranslateRequest(texts=[], target_lang="en"), settings=s) == []
