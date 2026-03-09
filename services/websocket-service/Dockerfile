FROM python:3.12-slim

WORKDIR /app

COPY services/websocket-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared ./shared

COPY services/websocket-service .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
