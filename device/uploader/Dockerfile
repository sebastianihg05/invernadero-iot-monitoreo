FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# El servicio actualiza /tmp/latido en cada vuelta de su bucle principal.
# Si pasan mas de 150 s sin latido, el contenedor se marca "unhealthy".
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import os, sys, time; sys.exit(0 if time.time() - os.path.getmtime('/tmp/latido') < 150 else 1)"

CMD ["python", "-u", "main.py"]
