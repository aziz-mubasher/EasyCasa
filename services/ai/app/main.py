from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel

from .routers import admin, assistant, recommend, search, valuation

app = FastAPI(title="EasyCasa AI Service", version="0.4.0")

app.include_router(search.router)
app.include_router(valuation.router)
app.include_router(recommend.router)
app.include_router(assistant.router)
app.include_router(admin.router)


class Health(BaseModel):
    status: str
    service: str
    time: str


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(status="ok", service="ai", time=datetime.now(timezone.utc).isoformat())
