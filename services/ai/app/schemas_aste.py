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


# Loose extraction envelope — LLM output validated/normalized in service.
ExtractionV1 = dict[str, Any]

Modalita = Literal["telematica", "mista", "analogica"]
