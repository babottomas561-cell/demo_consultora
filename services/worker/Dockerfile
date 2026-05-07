FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Set python path
ENV PYTHONPATH=/app

# Start Celery worker
CMD ["celery", "-A", "worker_app.celery_app", "worker", "--loglevel=info", "--concurrency=2"]
