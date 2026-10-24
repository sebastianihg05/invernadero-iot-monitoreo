FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    gcc \
    libc6-dev \
    swig \
    libgpiod-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import os, sys, time; sys.exit(0 if time.time() - os.path.getmtime('/tmp/latido') < 150 else 1)"

CMD ["python", "-u", "main.py"]