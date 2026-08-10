from __future__ import annotations

import json
import logging
import re
from typing import Any

from ..schemas_aste import TranslateRequest
from ..settings import Settings, get_settings

log = logging.getLogger("aste.translate")

SYSTEM_PROMPT = """You translate Italian judicial-auction document snippets into the target language.
Return ONLY valid JSON: {"translations":["..."]} with the same length and order as the input texts array.
Rules:
- Translate literally. Do not interpret, summarize, advise, or add claims.
- Keep Italian legal/auction terms in Italian and put the translation in parentheses immediately after.
  Example: "prezzo base (starting price)".
- Preserve numbers, dates, percentages, and RGE references unchanged.
- Empty string input → empty string output.
"""


def run_translate(req: TranslateRequest, settings: Settings | None = None) -> list[str]:
    s = settings or get_settings()
    texts = list(req.texts)
    if not texts:
        return []

    target = (req.target_lang or "en").strip().lower()
    if target not in ("en", "es", "fr", "de"):
        raise ValueError("unsupported_target_lang")

    if s.CHAT_PROVIDER != "openai" or not s.OPENAI_API_KEY:
        log.warning("translate_unavailable")
        raise RuntimeError("translate_unavailable")

    user_payload = {"target_lang": target, "texts": texts}
    raw = _complete(s, SYSTEM_PROMPT, json.dumps(user_payload, ensure_ascii=False))
    parsed = _parse(raw)
    translations = parsed.get("translations")
    if not isinstance(translations, list):
        raise ValueError("translate_invalid_shape")
    out: list[str] = []
    for i, _src in enumerate(texts):
        item = translations[i] if i < len(translations) else ""
        out.append(str(item) if item is not None else "")
    # Pad/truncate to exact length
    if len(out) < len(texts):
        out.extend([""] * (len(texts) - len(out)))
    return out[: len(texts)]


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
        timeout=getattr(s, "ASTE_TRANSLATE_HTTP_TIMEOUT", 120.0),
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
            raise ValueError("translate_invalid_json") from exc
        data = json.loads(m.group(0))
    if not isinstance(data, dict):
        raise ValueError("translate_not_object")
    return data
