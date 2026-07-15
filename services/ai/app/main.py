from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="EasyCasa AI Service")


class Health(BaseModel):
    status: str
    service: str
    time: str


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(
        status="ok",
        service="ai",
        time=datetime.now(timezone.utc).isoformat(),
    )
