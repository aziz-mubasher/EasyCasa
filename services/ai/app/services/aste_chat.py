from __future__ import annotations

import json
import logging
import re
from typing import Any

from ..schemas_aste import ChatAnswerRequest, ChatAnswerResponse, ChatCitation
from ..settings import Settings, get_settings

log = logging.getLogger("aste.chat")

PROMPT_VERSION = "aste-chat-v1"

SYSTEM_PROMPT = f"""You answer questions about Italian judicial auction (asta) documents.
Prompt version: {PROMPT_VERSION}.
Return ONLY valid JSON:
{{"answer":"...","citations":[{{"document_id":"...","page":1}}],"refused":false}}

Hard rules:
1. Answer ONLY from the provided chunks. If they do not contain the answer: say so plainly in answer_lang, suggest which document/verification would help, set refused=false, and use an empty citations array (honest not-in-documents — not a refusal).
2. REFUSE (refused=true) requests for legal/tax/investment advice, outcome predictions ("should I buy?", "will I win?"), or anything beyond document content. Use a short standard refusal in answer_lang pointing to the informational disclaimer and professional verification. citations=[].
3. Every factual claim MUST cite {{document_id, page}} from the provided chunks. If you cannot cite it, do not state it.
4. Quote short Italian source phrases verbatim alongside the answer_lang explanation. On first use of an Italian legal term from the glossary, expand it briefly.
5. NEVER name natural persons even if present in chunk text. Refer generically to "il debitore" / "l'occupante" / "the debtor" / "the occupant".
6. No advice on circumventing procedures, contacting the debtor, or occupancy self-help.
"""

PERSON_NAME = re.compile(
    r"\b(sig\.?|dott\.?|avv\.?|mr\.?|mrs\.?|ms\.?)\s+[A-ZÀ-Ü][a-zà-ü]+\b|"
    r"\b[A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][a-zà-ü]{2,}\b",
    re.UNICODE,
)

REFUSAL_IT = (
    "Non posso fornire consulenza legale, fiscale o di investimento, né prevedere esiti. "
    "EasyCasa fornisce analisi documentali a scopo informativo. "
    "Per decisioni, rivolgiti a un professionista abilitato. (COUNSEL REVIEW PENDING)"
)
REFUSAL_EN = (
    "I cannot provide legal, tax or investment advice, or predict outcomes. "
    "EasyCasa provides document analysis for informational purposes only. "
    "For decisions, consult a qualified professional. (COUNSEL REVIEW PENDING)"
)


def run_chat(req: ChatAnswerRequest, settings: Settings | None = None) -> ChatAnswerResponse:
    s = settings or get_settings()
    answer_lang = (req.answer_lang or "it").strip().lower()
    if answer_lang not in ("it", "en"):
        answer_lang = "it"

    if _looks_like_advice(req.question):
        return ChatAnswerResponse(
            answer=REFUSAL_EN if answer_lang == "en" else REFUSAL_IT,
            citations=[],
            refused=True,
        )

    if s.CHAT_PROVIDER != "openai" or not s.OPENAI_API_KEY:
        log.warning("chat_unavailable")
        raise RuntimeError("chat_unavailable")

    payload = {
        "question": req.question,
        "answer_lang": answer_lang,
        "chunks": [
            {"document_id": c.document_id, "page": c.page, "text": c.text} for c in req.chunks
        ],
        "glossary": [
            {"term_key": g.term_key, "definition": g.definition} for g in req.glossary
        ],
    }
    raw = _complete(s, SYSTEM_PROMPT, json.dumps(payload, ensure_ascii=False))
    parsed = _parse(raw)
    answer = str(parsed.get("answer") or "").strip()
    refused = bool(parsed.get("refused"))
    citations = _normalize_citations(parsed.get("citations"), req.chunks)

    if refused:
        answer = REFUSAL_EN if answer_lang == "en" else REFUSAL_IT
        citations = []

    answer = PERSON_NAME.sub("[omesso]", answer)
    # Drop any leftover multi-token Capitalized names that slipped past
    answer = re.sub(
        r"\b[A-ZÀ-Ü][a-zà-ü]{2,}\s+[A-ZÀ-Ü][a-zà-ü]{2,}\b",
        "[omesso]",
        answer,
    )

    if not answer:
        answer = (
            "The provided documents do not contain a clear answer to this question."
            if answer_lang == "en"
            else "I documenti forniti non contengono una risposta chiara a questa domanda."
        )
        citations = []
        refused = False

    return ChatAnswerResponse(answer=answer, citations=citations, refused=refused)


def _looks_like_advice(question: str) -> bool:
    q = (question or "").lower()
    patterns = [
        r"should i buy",
        r"devo comprare",
        r"conviene comprare",
        r"will i win",
        r"vincer[oò]",
        r"investimento consigliat",
        r"legal advice",
        r"consulenza legale",
        r"tax advice",
        r"consulenza fiscal",
        r"garantisc[ie]",
    ]
    return any(re.search(p, q) for p in patterns)


def _normalize_citations(raw: Any, chunks: list) -> list[ChatCitation]:
    allowed = {(c.document_id, int(c.page)) for c in chunks}
    out: list[ChatCitation] = []
    if not isinstance(raw, list):
        return out
    seen: set[tuple[str, int]] = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        doc = str(item.get("document_id") or "").strip()
        try:
            page = int(item.get("page"))
        except (TypeError, ValueError):
            continue
        key = (doc, page)
        if key not in allowed or key in seen:
            continue
        seen.add(key)
        out.append(ChatCitation(document_id=doc, page=page))
    return out


def _complete(s: Settings, system: str, user: str) -> str:
    import httpx

    resp = httpx.post(
        f"{s.OPENAI_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {s.OPENAI_API_KEY}"},
        json={
            "model": s.CHAT_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        },
        timeout=getattr(s, "ASTE_CHAT_HTTP_TIMEOUT", 120.0),
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _parse(raw: str) -> dict[str, Any]:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if not m:
            raise ValueError("chat_invalid_json") from exc
        data = json.loads(m.group(0))
    if not isinstance(data, dict):
        raise ValueError("chat_not_object")
    return data
