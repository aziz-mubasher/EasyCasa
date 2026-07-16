from __future__ import annotations

from typing import Protocol

import httpx

from ..settings import Settings, get_settings


class ChatProvider(Protocol):
    def complete(self, system: str, user: str) -> str: ...


class OpenAIChat:
    def __init__(self, s: Settings) -> None:
        self.s = s

    def complete(self, system: str, user: str) -> str:
        resp = httpx.post(
            f"{self.s.OPENAI_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {self.s.OPENAI_API_KEY}"},
            json={
                "model": self.s.CHAT_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.2,
            },
            timeout=self.s.HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


class TemplatedChat:
    """Offline fallback — no LLM. The assistant service supplies a grounded summary."""

    def complete(self, system: str, user: str) -> str:
        return user  # assistant.py builds a templated grounded answer when provider=none


def get_chat(s: Settings | None = None) -> ChatProvider:
    s = s or get_settings()
    if s.CHAT_PROVIDER == "openai":
        return OpenAIChat(s)
    return TemplatedChat()
