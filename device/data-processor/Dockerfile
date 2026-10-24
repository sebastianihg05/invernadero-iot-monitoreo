FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import os, sys, time; sys.exit(0 if time.time() - os.path.getmtime('/tmp/latido') < 150 else 1)"

CMD ["python", "-u", "main.py"]
