import os
import json
import time
import uuid
import signal
import logging
import threading
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

# ==========================================
# CONFIGURACION
# ==========================================

DEVICE_ID = os.getenv("DEVICE_ID", "invernadero-01")
GPIO_DHT = int(os.getenv("GPIO_DHT", "4"))
INTERVALO = 10

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = "invernadero/lecturas"

MODO_SIMULADO = (
    os.getenv("MODO_SIMULADO", "false").lower() == "true"
)

detener = threading.Event()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("adquisicion")


# ==========================================
# CONEXION MQTT
# ==========================================

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        logger.info("Conexion MQTT establecida")
    else:
        logger.error("Error de conexion MQTT: %s", reason_code)


def on_disconnect(
    client, userdata, disconnect_flags,
    reason_code, properties
):
    if not detener.is_set():
        logger.warning("Conexion MQTT perdida: %s", reason_code)


def conectar_mqtt():
    cliente = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"adquisicion-{DEVICE_ID}"
    )

    cliente.on_connect = on_connect
    cliente.on_disconnect = on_disconnect

    cliente.reconnect_delay_set(
        min_delay=1,
        max_delay=30
    )

    cliente.connect_async(MQTT_HOST, MQTT_PORT, 60)
    cliente.loop_start()

    return cliente


# ==========================================
# INICIALIZACION DEL SENSOR DHT22
# ==========================================

def iniciar_sensor():
    if MODO_SIMULADO:
        logger.info("Modo simulado activado")
        return None

    import board
    import adafruit_dht

    pin = getattr(board, f"D{GPIO_DHT}")

    sensor = adafruit_dht.DHT22(
        pin,
        use_pulseio=False
    )

    logger.info("Sensor DHT22 inicializado")

    return sensor


# ==========================================
# LECTURA DE DATOS
# ==========================================

def leer_sensor(sensor, intentos_maximos=3, espera_entre_intentos=2):
    if MODO_SIMULADO:
        import random
        temperatura = random.uniform(20, 30)
        humedad = random.uniform(40, 80)
        return temperatura, humedad

    for intento in range(1, intentos_maximos + 1):
        try:
            temperatura = sensor.temperature
            humedad = sensor.humidity

            if temperatura is not None and humedad is not None:
                return temperatura, humedad
                
        except (RuntimeError, OSError) as error:
            logger.warning(
                "Intento %s/%s fallido al leer el sensor: %s", 
                intento, intentos_maximos, error
            )
            
            if intento < intentos_maximos:
                time.sleep(espera_entre_intentos)
            else:
                raise RuntimeError("Fallaron todos los reintentos de lectura del sensor")

    raise RuntimeError("Lectura incompleta del sensor")


# ==========================================
# CREACION DEL MENSAJE
# ==========================================

def crear_mensaje(temperatura, humedad):
    return {
        "id_lectura": str(uuid.uuid4()),
        "device_id": DEVICE_ID,
        "sensor": "DHT22",
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "temperatura_c": temperatura,
        "humedad_pct": humedad,
        "simulado": MODO_SIMULADO
    }

#======================================
#CREACION DEL MENSAJE DE ERROR
#======================================

def crear_mensaje_error(error):
    return {
        "id_lectura": str(uuid.uuid4()),
        "device_id": DEVICE_ID,
        "sensor": "DHT22",
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "tipo": "error_lectura",
        "motivo": str(error)
    }
# ==========================================
# PUBLICACION MQTT
# ==========================================

def publicar_datos(cliente, datos):
    if not cliente.is_connected():
        logger.warning("MQTT desconectado. Lectura no enviada")
        return False

    mensaje = json.dumps(datos)

    resultado = cliente.publish(
        MQTT_TOPIC,
        payload=mensaje,
        qos=1
    )

    try:
        resultado.wait_for_publish(timeout=3)
    except RuntimeError as error:
        logger.error("Error de publicacion: %s", error)
        return False

    if resultado.is_published():
        logger.info("Datos publicados: %s", mensaje)
        return True

    logger.warning("Publicacion no confirmada")
    return False


# ==========================================
# CIERRE DEL SERVICIO
# ==========================================

def cerrar_servicio(signum, frame):
    logger.info("Solicitando cierre del microservicio")
    detener.set()


# ==========================================
# PROGRAMA PRINCIPAL
# ==========================================
# ==========================================
# EJECUCION DEL SERVICIO
# ==========================================

signal.signal(signal.SIGINT, cerrar_servicio)
signal.signal(signal.SIGTERM, cerrar_servicio)

sensor = iniciar_sensor()
cliente = conectar_mqtt()

logger.info("Microservicio de adquisicion iniciado")
logger.info("Intervalo de lectura: %s segundos", INTERVALO)

try:
    while not detener.is_set():

        inicio = time.monotonic()

        try:
            temperatura, humedad = leer_sensor(sensor)

            datos = crear_mensaje(
                temperatura,
                humedad
            )

            logger.info(
                "Temperatura: %s C | Humedad: %s %%",
                temperatura,
                humedad
            )

            publicar_datos(cliente, datos)

        except (RuntimeError, ValueError, OSError) as error:
            logger.warning("Error de lectura: %s", error)
            datos_error = crear_mensaje_error(error)
            publicar_datos(cliente, datos_error)

        tiempo_transcurrido = time.monotonic() - inicio
        espera = max(0, INTERVALO - tiempo_transcurrido)

        detener.wait(espera)

finally:
    cliente.disconnect()
    cliente.loop_stop()

    if sensor is not None:
        sensor.exit()

    logger.info("Microservicio finalizado")