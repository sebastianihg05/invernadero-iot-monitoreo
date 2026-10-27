import json
import logging
import os
import signal
import sqlite3
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import paho.mqtt.client as mqtt
import requests

# ==========================================
# CONFIGURACION
# ==========================================

DEVICE_ID = os.getenv("DEVICE_ID", "invernadero-01")

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

MQTT_TOPIC_ENTRADA = "invernadero/procesados"
MQTT_TOPIC_CONFIG = "invernadero/configuracion"

API_URL = os.getenv("API_URL", "").strip()
CONFIG_URL = os.getenv("CONFIG_URL", "").strip()
DEVICE_TOKEN = os.getenv("DEVICE_TOKEN", "").strip()

SQLITE_PATH = Path(
    os.getenv(
        "SQLITE_PATH",
        "./datos/sincronizacion.db"
    )
)

INTERVALO_CONFIG = 20
TIMEOUT_HTTP = 10

detener = threading.Event()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("sincronizacion")


# ==========================================
# BASE DE DATOS LOCAL SQLITE
# ==========================================

def conectar_db():
    return sqlite3.connect(
        str(SQLITE_PATH),
        timeout=10
    )


def iniciar_db():
    SQLITE_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with conectar_db() as db:
        db.execute("PRAGMA journal_mode=WAL")

        db.execute("""
            CREATE TABLE IF NOT EXISTS pendientes (
                id_resumen TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                recibido_en TEXT NOT NULL
            )
        """)

    logger.info("SQLite inicializada")


# ==========================================
# GUARDAR DATOS PENDIENTES
# ==========================================

def guardar_resumen(datos):

    identificador = datos["id_resumen"]

    payload = json.dumps(
        datos,
        ensure_ascii=False,
        allow_nan=False
    )

    fecha = datetime.now(
        timezone.utc
    ).isoformat()

    with conectar_db() as db:
        resultado = db.execute(
            """
            INSERT OR IGNORE INTO pendientes
            (id_resumen, payload, recibido_en)
            VALUES (?, ?, ?)
            """,
            (identificador, payload, fecha)
        )

        return resultado.rowcount == 1


# ==========================================
# OBTENER DATOS PENDIENTES
# ==========================================

def siguiente_pendiente():

    with conectar_db() as db:
        return db.execute(
            """
            SELECT id_resumen, payload
            FROM pendientes
            ORDER BY recibido_en ASC, rowid ASC
            LIMIT 1
            """
        ).fetchone()


# ==========================================
# ELIMINAR DATOS CONFIRMADOS
# ==========================================

def eliminar_pendiente(identificador):

    with conectar_db() as db:
        db.execute(
            """
            DELETE FROM pendientes
            WHERE id_resumen = ?
            """,
            (identificador,)
        )


# ==========================================
# CONEXION MQTT
# ==========================================

def on_connect(
    cliente, userdata, flags,
    reason_code, properties
):

    if reason_code == 0:

        cliente.subscribe(
            MQTT_TOPIC_ENTRADA,
            qos=1
        )

        logger.info(
            "Conectado a Mosquitto: %s",
            MQTT_TOPIC_ENTRADA
        )

    else:
        logger.error(
            "Error de conexion MQTT: %s",
            reason_code
        )


def on_disconnect(
    cliente, userdata, flags,
    reason_code, properties
):

    if not detener.is_set():
        logger.warning(
            "MQTT desconectado: %s",
            reason_code
        )


# ==========================================
# RECEPCION DE DATOS PROCESADOS
# ==========================================

def on_message(cliente, userdata, mensaje):

    try:
        datos = json.loads(
            mensaje.payload.decode("utf-8")
        )

        if not isinstance(datos, dict):
            raise ValueError("JSON incorrecto")

        if datos.get("tipo") != "resumen_minuto":
            raise ValueError(
                "Tipo de mensaje no reconocido"
            )

        if datos.get("device_id") != DEVICE_ID:
            raise ValueError(
                "Dispositivo no coincide"
            )

        identificador = datos.get("id_resumen")

        if (
            not isinstance(identificador, str)
            or not (1 <= len(identificador) <= 128)
        ):
            raise ValueError(
                "Identificador de resumen invalido"
            )

        nuevo = guardar_resumen(datos)

        if nuevo:
            logger.info(
                "Resumen guardado: %s",
                identificador
            )
        else:
            logger.info(
                "Resumen duplicado: %s",
                identificador
            )

    except (
        UnicodeDecodeError,
        json.JSONDecodeError,
        ValueError,
        TypeError
    ) as error:

        logger.warning(
            "Mensaje incorrecto: %s",
            error
        )

    except sqlite3.Error as error:

        logger.error(
            "Error guardando en SQLite: %s",
            error
        )

        return

    # Confirmar MQTT despues de almacenar.
    if mensaje.qos > 0:
        cliente.ack(
            mensaje.mid,
            mensaje.qos
        )


# ==========================================
# AUTENTICACION DE LA API
# ==========================================

def encabezados():

    return {
        "Authorization": f"Bearer {DEVICE_TOKEN}",
        "Content-Type": "application/json"
    }


# ==========================================
# ENVIO DE DATOS A VERCEL
# ==========================================

def enviar_resumen(
    sesion, identificador, payload
):

    headers = encabezados()

    headers["Idempotency-Key"] = identificador

    respuesta = sesion.post(
        API_URL,
        data=payload.encode("utf-8"),
        headers=headers,
        timeout=TIMEOUT_HTTP
    )

    if 200 <= respuesta.status_code < 300:

        eliminar_pendiente(identificador)

        logger.info(
            "Resumen enviado y confirmado: %s",
            identificador
        )

        return True

    logger.warning(
        "API respondio HTTP %s. "
        "Resumen conservado en SQLite.",
        respuesta.status_code
    )

    return False


# ==========================================
# CONFIGURACION REMOTA
# ==========================================

def consultar_configuracion(sesion, cliente):

    if not CONFIG_URL:
        return

    try:
        respuesta = sesion.get(
            CONFIG_URL,
            headers=encabezados(),
            timeout=TIMEOUT_HTTP
        )

        if respuesta.status_code != 200:

            logger.warning(
                "Error consultando configuracion: %s",
                respuesta.status_code
            )

            return

        configuracion = respuesta.json()

        if not isinstance(configuracion, dict):
            raise ValueError(
                "Configuracion incorrecta"
            )

        if configuracion.get(
            "device_id", DEVICE_ID
        ) != DEVICE_ID:

            raise ValueError(
                "Configuracion de otro dispositivo"
            )

        if cliente.is_connected():

            cliente.publish(
                MQTT_TOPIC_CONFIG,
                json.dumps(
                    configuracion,
                    ensure_ascii=False,
                    allow_nan=False
                ),
                qos=1,
                retain=True
            )

            logger.info(
                "Configuracion publicada en MQTT"
            )

    except (
        requests.RequestException,
        ValueError
    ) as error:

        logger.warning(
            "Error de configuracion: %s",
            error
        )


# ==========================================
# CIERRE DEL MICROSERVICIO
# ==========================================

def cerrar_servicio(signum, frame):
    detener.set()


# ==========================================
# PROGRAMA PRINCIPAL
# ==========================================

def main():

    signal.signal(
        signal.SIGINT,
        cerrar_servicio
    )

    signal.signal(
        signal.SIGTERM,
        cerrar_servicio
    )

    if API_URL and not API_URL.startswith("https://"):
        raise ValueError(
            "La API debe utilizar HTTPS"
        )

    if CONFIG_URL and not CONFIG_URL.startswith("https://"):
        raise ValueError(
            "La configuracion debe utilizar HTTPS"
        )

    iniciar_db()

    cliente = mqtt.Client(
        callback_api_version=(
            mqtt.CallbackAPIVersion.VERSION2
        ),
        client_id=f"sincronizacion-{DEVICE_ID}",
        clean_session=False,
        manual_ack=True
    )

    if MQTT_USER:
        cliente.username_pw_set(
            MQTT_USER,
            MQTT_PASSWORD
        )

    cliente.on_connect = on_connect
    cliente.on_disconnect = on_disconnect
    cliente.on_message = on_message

    cliente.reconnect_delay_set(
        min_delay=1,
        max_delay=30
    )

    cliente.connect_async(
        MQTT_HOST,
        MQTT_PORT,
        60
    )

    cliente.loop_start()

    logger.info(
        "Microservicio de sincronizacion iniciado"
    )

    if not API_URL or not DEVICE_TOKEN:
        logger.warning(
            "API no configurada. "
            "Los datos quedaran en SQLite."
        )

    pausa_reintento = 2
    proxima_config = time.monotonic()

    try:

        with requests.Session() as sesion:

            while not detener.is_set():

                # Latido para el HEALTHCHECK de Docker (ver Dockerfile)
                Path("/tmp/latido").touch()

                # Consultar configuracion remota
                if (
                    DEVICE_TOKEN
                    and CONFIG_URL
                    and time.monotonic() >= proxima_config
                ):

                    consultar_configuracion(
                        sesion,
                        cliente
                    )

                    proxima_config = (
                        time.monotonic()
                        + INTERVALO_CONFIG
                    )

                # Sin API, conservar datos locales
                if not API_URL or not DEVICE_TOKEN:

                    detener.wait(3)
                    continue

                try:

                    pendiente = siguiente_pendiente()

                    if pendiente is None:
                        detener.wait(2)
                        continue

                    identificador, payload = pendiente

                    enviado = enviar_resumen(
                        sesion,
                        identificador,
                        payload
                    )

                    if enviado:
                        pausa_reintento = 2
                        continue

                except (
                    requests.RequestException,
                    sqlite3.Error
                ) as error:

                    logger.warning(
                        "Error de sincronizacion: %s",
                        error
                    )

                # Esperar antes de reintentar
                detener.wait(pausa_reintento)

                pausa_reintento = min(
                    pausa_reintento * 2,
                    60
                )

    finally:

        cliente.disconnect()
        cliente.loop_stop()

        logger.info(
            "Microservicio de sincronizacion detenido"
        )


if __name__ == "__main__":
    main()
