from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class OcrPageOut(BaseModel):
    page: int
    text: str
    ocr_used: bool


class OcrResponse(BaseModel):
    pages: list[OcrPageOut]
    page_count: int
    ocr_pages: int


class ExtractPageIn(BaseModel):
    page: int
    text: str


class ExtractDocumentIn(BaseModel):
    file: str
    doc_type: str
    pages: list[ExtractPageIn]


class ExtractRequest(BaseModel):
    language: str = "it"
    documents: list[ExtractDocumentIn]
    # EC-23b — user lot selector; null = unico / only lot.
    lotto_label: str | None = None


class SourceRef(BaseModel):
    file: str
    page: int


class SourcedNumber(BaseModel):
    value: float
    source: SourceRef


class EmbedRequest(BaseModel):
    texts: list[str] = Field(default_factory=list)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    dim: int


class TranslateRequest(BaseModel):
    texts: list[str] = Field(default_factory=list)
    target_lang: str = "en"


class TranslateResponse(BaseModel):
    translations: list[str]


class ChatChunkIn(BaseModel):
    document_id: str
    page: int
    text: str


class ChatGlossaryIn(BaseModel):
    term_key: str
    definition: str


class ChatAnswerRequest(BaseModel):
    question: str
    answer_lang: str = "it"
    chunks: list[ChatChunkIn] = Field(default_factory=list)
    glossary: list[ChatGlossaryIn] = Field(default_factory=list)
    # EC-23b — analysis lot scope (null = unico).
    lotto_label: str | None = None


class ChatCitation(BaseModel):
    document_id: str
    page: int


class ChatAnswerResponse(BaseModel):
    answer: str
    citations: list[ChatCitation] = Field(default_factory=list)
    refused: bool = False


# Loose extraction envelope — LLM output validated/normalized in service.
ExtractionV1 = dict[str, Any]

Modalita = Literal["telematica", "mista", "analogica"]
