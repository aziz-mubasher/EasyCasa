from __future__ import annotations

from ..providers.chat import get_chat
from ..schemas import AssistantRequest, AssistantResponse, ListingHit
from ..settings import get_settings
from .search import semantic_search

_HANDOFF = ("agent", "human", "call", "chiama", "parlare con", "contatt", "persona", "hablar con")

_GREETING = {
    "it": "Ecco alcuni immobili che corrispondono alla tua richiesta:",
    "en": "Here are some listings that match your request:",
    "es": "Aquí tienes algunos inmuebles que coinciden con tu búsqueda:",
}
_NONE = {
    "it": "Non ho trovato immobili adatti. Prova a modificare i criteri.",
    "en": "I couldn't find suitable listings. Try adjusting your criteria.",
    "es": "No encontré inmuebles adecuados. Intenta ajustar los criterios.",
}


def _grounding(hits: list[ListingHit]) -> str:
    lines = []
    for h in hits:
        parts = [h.title]
        if h.city:
            parts.append(h.city)
        if h.price:
            parts.append(f"€{int(h.price):,}")
        if h.size_sqm:
            parts.append(f"{int(h.size_sqm)} m²")
        lines.append(" · ".join(parts))
    return "\n".join(f"- {ln}" for ln in lines)


def answer(req: AssistantRequest) -> AssistantResponse:
    locale = req.locale if req.locale in _GREETING else "it"
    hits = semantic_search(req.message, limit=5).items
    handoff = any(k in req.message.lower() for k in _HANDOFF)

    s = get_settings()
    if s.CHAT_PROVIDER == "none" or not hits:
        head = _GREETING[locale] if hits else _NONE[locale]
        body = _grounding(hits)
        return AssistantResponse(answer=(head + "\n" + body).strip(), listings=hits, handoff=handoff)

    # LLM path — grounded strictly in retrieved listings (RAG).
    system = (
        f"You are EasyCasa's assistant. Answer in locale '{locale}'. "
        "Only use the listings provided as CONTEXT. Never invent listings, prices, or URLs. "
        "If nothing fits, say so and suggest adjusting the search."
    )
    user = f"User: {req.message}\n\nCONTEXT (real listings):\n{_grounding(hits)}"
    text = get_chat(s).complete(system, user)
    return AssistantResponse(answer=text, listings=hits, handoff=handoff)
