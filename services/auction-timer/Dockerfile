FROM python:3.12-slim

WORKDIR /app

COPY services/auction-timer/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared ./shared

COPY services/auction-timer .

CMD ["python", "-m", "timer"]
