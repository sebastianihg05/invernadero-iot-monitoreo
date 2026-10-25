FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
# RPi.GPIO (buzzer) se compila en ARM: el compilador solo se instala durante el pip install
# y se elimina despues, para que la imagen quede liviana.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libc6-dev \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y gcc libc6-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY . .

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import os, sys, time; sys.exit(0 if time.time() - os.path.getmtime('/tmp/latido') < 150 else 1)"

CMD ["python", "-u", "main.py"]
