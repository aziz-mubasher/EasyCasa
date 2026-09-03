from __future__ import annotations

import json
import logging
import re
from typing import Any

from ..schemas_aste import TranslateRequest
from ..settings import Settings, get_settings

log = logging.getLogger("aste.translate")

# Report picker langs plus chat helpers (it / fr / de). `it` is identity on Nest.
ALLOWED_LANGS = {
    "it",
    "en",
    "es",
    "ur",
    "hi",
    "pa",
    "ro",
    "sq",
    "ar",
    "uk",
    "bn",
    "tl",
    "fr",
    "de",
}

LANG_NAMES = {
    "it": "Italian",
    "en": "English",
    "es": "Spanish",
    "ur": "Urdu (Nastaliq / Arabic script)",
    "hi": "Hindi (Devanagari)",
    "pa": "Punjabi (Gurmukhi)",
    "ro": "Romanian",
    "sq": "Albanian",
    "ar": "Modern Standard Arabic",
    "uk": "Ukrainian",
    "bn": "Bengali (Bengali script)",
    "tl": "Tagalog (Filipino)",
    "fr": "French",
    "de": "German",
}

# Paid model for report quality. Chat stays on CHAT_MODEL (gpt-4o-mini).
DEFAULT_TRANSLATE_MODEL = "gpt-4o"


def _system_prompt(target: str) -> str:
    name = LANG_NAMES.get(target, target)
    return (
        "You are a professional legal translator for Italian court-auction "
        "(esecuzione immobiliare / perizia CTU) report snippets.\n"
        f"Translate each string from Italian into {name}.\n"
        "Return ONLY valid JSON: {\"translations\":[\"...\"]} with the same "
        "length and order as the input texts array.\n"
        "Rules:\n"
        "- Keep legal meaning exact. Do not invent facts, lots, prices, or risks.\n"
        "- Do not interpret, summarize, advise, or add claims.\n"
        "- Keep Italian legal/auction terms that have no clean equivalent in "
        "Italian and put the translation in parentheses after them on first use "
        '(e.g. "pignoramento (foreclosure)", "prezzo base (starting price)").\n'
        "- Preserve numbers, euro amounts, percentages, dates, cadastral codes, "
        "lot labels, and proper names as written.\n"
        "- Empty string input → empty string output.\n"
        "- For Arabic and Urdu use the natural RTL script; do not add Latin "
        "transliteration unless the source is already a Latin proper name.\n"
        "- Punjabi must use Gurmukhi. Hindi must use Devanagari. "
        "Bengali must use Bengali script. Urdu must use Arabic/Nastaliq script."
    )


def _translate_model(s: Settings) -> str:
    override = getattr(s, "ASTE_TRANSLATE_MODEL", None)
    if isinstance(override, str) and override.strip():
        return override.strip()
    return DEFAULT_TRANSLATE_MODEL


def run_translate(req: TranslateRequest, settings: Settings | None = None) -> list[str]:
    s = settings or get_settings()
    texts = list(req.texts)
    if not texts:
        return []

    target = (req.target_lang or "en").strip().lower()
    if target not in ALLOWED_LANGS:
        raise ValueError("unsupported_target_lang")

    if s.CHAT_PROVIDER != "openai" or not s.OPENAI_API_KEY:
        log.warning("translate_unavailable")
        raise RuntimeError("translate_unavailable")

    user_payload = {"target_lang": target, "texts": texts}
    raw = _complete(s, _system_prompt(target), json.dumps(user_payload, ensure_ascii=False))
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
            "model": _translate_model(s),
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
