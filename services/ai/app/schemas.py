from __future__ import annotations

from pydantic import BaseModel


class ParsedFilters(BaseModel):
    transaction_type: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    min_bedrooms: int | None = None
    region_slug: str | None = None
    category_slug: str | None = None


class ParsedQuery(BaseModel):
    text: str
    filters: ParsedFilters = ParsedFilters()


class ListingHit(BaseModel):
    id: str
    slug: str | None = None
    title: str
    price: float | None = None
    city: str | None = None
    bedrooms: int | None = None
    size_sqm: float | None = None
    score: float | None = None


class SearchRequest(BaseModel):
    query: str
    limit: int = 24


class SearchResponse(BaseModel):
    parsed: ParsedQuery
    items: list[ListingHit]


class ValuationRequest(BaseModel):
    region_slug: str | None = None
    category_slug: str | None = None
    city: str | None = None
    size_sqm: float
    bedrooms: int | None = None


class ValuationResponse(BaseModel):
    estimate: float | None
    low: float | None
    high: float | None
    price_per_sqm: float | None
    confidence: str
    comparables: int


class AssistantRequest(BaseModel):
    message: str
    locale: str = "it"


class AssistantResponse(BaseModel):
    answer: str
    listings: list[ListingHit]
    handoff: bool
