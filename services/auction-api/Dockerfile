FROM python:3.12-slim

WORKDIR /app

# Service dependencies
COPY services/auction-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared package as a subdirectory — importable as `shared.schemas`, `shared.kafka`
COPY shared ./shared

# Copy service source
COPY services/auction-api .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
