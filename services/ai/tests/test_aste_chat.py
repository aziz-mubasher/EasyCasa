"""EC-25 — grounded chat answer tests (mocked LLM)."""

from __future__ import annotations

import json

import pytest

from app.schemas_aste import ChatAnswerRequest, ChatChunkIn
from app.services import aste_chat
from app.services.aste_chat import run_chat
from app.settings import Settings


def test_advice_refused_without_llm() -> None:
    s = Settings(CHAT_PROVIDER="none", OPENAI_API_KEY="")
    out = run_chat(
        ChatAnswerRequest(question="Should I buy this property?", answer_lang="en", chunks=[]),
        settings=s,
    )
    assert out.refused is True
    assert out.citations == []
    assert "informational" in out.answer.lower() or "COUNSEL" in out.answer


def test_not_in_documents(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_complete(s, system, user):  # noqa: ARG001
        return json.dumps(
            {
                "answer": "The documents do not state visiting rules.",
                "citations": [],
                "refused": False,
            }
        )

    monkeypatch.setattr(aste_chat, "_complete", fake_complete)
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    out = run_chat(
        ChatAnswerRequest(
            question="Can I visit?",
            answer_lang="en",
            chunks=[
                ChatChunkIn(document_id="d1", page=1, text="Prezzo base 200000 euro"),
            ],
        ),
        settings=s,
    )
    assert out.refused is False
    assert out.citations == []


def test_citations_must_match_chunks(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_complete(s, system, user):  # noqa: ARG001
        return json.dumps(
            {
                "answer": "Base price is 200000.",
                "citations": [
                    {"document_id": "d1", "page": 2},
                    {"document_id": "forged", "page": 99},
                ],
                "refused": False,
            }
        )

    monkeypatch.setattr(aste_chat, "_complete", fake_complete)
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    out = run_chat(
        ChatAnswerRequest(
            question="What is the base price?",
            answer_lang="en",
            chunks=[
                ChatChunkIn(
                    document_id="d1",
                    page=2,
                    text="Prezzo base 200000. Occupato da Mario Rossi.",
                ),
            ],
        ),
        settings=s,
    )
    assert len(out.citations) == 1
    assert out.citations[0].document_id == "d1"
    assert out.citations[0].page == 2


def test_person_names_scrubbed(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_complete(s, system, user):  # noqa: ARG001
        return json.dumps(
            {
                "answer": "The property is occupied by Mario Rossi according to the notice.",
                "citations": [{"document_id": "d1", "page": 1}],
                "refused": False,
            }
        )

    monkeypatch.setattr(aste_chat, "_complete", fake_complete)
    s = Settings(CHAT_PROVIDER="openai", OPENAI_API_KEY="sk-test")
    out = run_chat(
        ChatAnswerRequest(
            question="Who occupies?",
            answer_lang="en",
            chunks=[ChatChunkIn(document_id="d1", page=1, text="Occupato da Mario Rossi")],
        ),
        settings=s,
    )
    assert "Mario Rossi" not in out.answer
    assert "[omesso]" in out.answer


def test_requires_openai_for_normal_question() -> None:
    s = Settings(CHAT_PROVIDER="none", OPENAI_API_KEY="")
    with pytest.raises(RuntimeError, match="chat_unavailable"):
        run_chat(
            ChatAnswerRequest(question="Qual è il prezzo base?", answer_lang="it", chunks=[]),
            settings=s,
        )
