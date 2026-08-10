FROM python:3.12-slim
WORKDIR /app

# EC-23 — Tesseract + poppler for aste OCR (ita+eng). Not used by other AI routes.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-ita \
    tesseract-ocr-eng \
    poppler-utils \
  && rm -rf /var/lib/apt/lists/*

COPY services/ai/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY services/ai/app ./app
COPY services/ai/worker ./worker
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
