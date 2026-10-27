import json
import logging
import math
import os
import signal
import threading
import time
import uuid
from datetime import datetime, timezone
import RPi.GPIO as GPIO
import paho.mqtt.client as mqtt
from pathlib import Path

# ==========================================
# CONFIGURACION DEL BUZZER Y GPIO
# ==========================================
BUZZER_PIN = int(os.getenv("BUZZER_PIN", "17"))

GPIO.setmode(GPIO.BCM)
GPIO.setup(BUZZER_PIN, GPIO.OUT)
pwm = GPIO.PWM(BUZZER_PIN, 440)

NOTAS = {
    'DO5': 523.25, 'RE4': 293.66, 'MI4': 329.63, 'FA4': 349.23,
    'SOL4': 392.00, 'LA4': 440.00, 'DO6': 1046.50, 'SI5': 987.77,
    'LA5': 880, 'SOL5': 783.99, 'FA#5': 739.99, 'RE5': 587.33,
    'FA5': 698.46, 'MI5': 659.25, 'RE#5': 622.25, 'SI4': 493.88
}

melodia = [
    ('DO6', 1.0), ('DO6', 0.18), ('SI5', 0.18), ('LA5', 0.18),
    ('SOL5', 0.18), ('FA#5', 0.35), ('RE5', 0.35), ('FA#5', 0.35),
    ('DO6', 0.35), ('SI5', 0.35), ('SOL5', 0.35), ('FA#5', 1.0),
    ('FA5', 1.0), ('MI5', 1.0), ('RE#5', 0.35), ('RE5', 0.35),
    ('SI4', 0.35), ('DO5', 0.18), ('DO6', 0.18), ('DO5', 0.18),
    ('DO6', 0.18), ('DO5', 0.18), ('DO6', 0.18), ('DO5', 0.35),
    ('DO6', 0.18), ('SI5', 0.18), ('LA5', 0.18), ('SOL5', 0.18),
    ('FA#5', 0.35), ('RE5', 0.35), ('FA#5', 0.35), ('SI5', 0.35),
    ('LA5', 0.35), ('FA#5', 0.35), ('SOL5', 1.0)
]

alarma_lock = threading.Lock()

def reproducir_melodia():
    if not alarma_lock.acquire(blocking=False):
        return
    try:
        pwm.start(10)
        for nota, duracion in melodia:
            if detener.is_set():
                break
            pwm.ChangeFrequency(NOTAS[nota])
            time.sleep(duracion)
    except Exception as error:
        logger.error("Error al reproducir la melodía: %s", error)
    finally:
        try:
            pwm.stop()
        except Exception:
            pass
        alarma_lock.release()

def disparar_alarma_async():
    hilo = threading.Thread(target=reproducir_melodia, daemon=True)
    hilo.start()

# ==========================================
# CONFIGURACION
# ==========================================

DEVICE_ID = os.getenv("DEVICE_ID", "invernadero-01")

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

MQTT_TOPIC_ENTRADA = "invernadero/lecturas"
MQTT_TOPIC_SALIDA = "invernadero/procesados"

INTERVALO_RESUMEN = 60
DECIMALES = 1
DECIMALES_VPD = 2  # kPa: se muestran dos decimales para conservar precision

# Umbrales provisionales
TEMP_MIN = float(os.getenv("TEMP_MIN", "18"))
TEMP_MAX = float(os.getenv("TEMP_MAX", "30"))
HUM_MIN = float(os.getenv("HUM_MIN", "40"))
HUM_MAX = float(os.getenv("HUM_MAX", "80"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("procesamiento")

detener = threading.Event()
bloqueo = threading.Lock()


# ==========================================
# ALMACENAMIENTO TEMPORAL
# ==========================================

def nuevo_periodo():
    return {
        "total": 0,
        "normales": 0,
        "alertas": 0,
        "invalidas": 0,
        "simuladas": 0,
        "temperaturas": [],
        "humedades": [],
        "vpds": [],
        "eventos": [],
        "buzzer_activo": False
    }


periodo = nuevo_periodo()


def fecha_actual():
    return datetime.now(timezone.utc).isoformat()


def valor_seguro(valor):
    if isinstance(valor, float) and not math.isfinite(valor):
        return str(valor)
    return valor


# ==========================================
# CALCULO DE VPD AMBIENTAL (kPa)
# ==========================================

def calcular_vpd(temperatura, humedad):
    """VPD del aire; requiere una lectura ya validada del DHT22.

    No usa temperatura foliar: no representa el VPD hoja-aire.
    Se conserva la precision hasta generar el resumen del minuto.
    """
    presion_saturacion = 0.6108 * math.exp(
        (17.27 * temperatura) / (temperatura + 237.3)
    )
    return presion_saturacion * (1 - humedad / 100)


# ==========================================
# REGISTRO DE LECTURAS INVALIDAS
# ==========================================

def registrar_invalida(datos, motivos):
    evento = {
        "id_lectura": str(
            datos.get("id_lectura") or uuid.uuid4()
        ),
        "timestamp": datos.get("timestamp") or fecha_actual(),
        "sensor": datos.get("sensor", "DHT22"),
        "estado": "invalida",
        "motivos": motivos,
        "temperatura_original": valor_seguro(
            datos.get("temperatura_c")
        ),
        "humedad_original": valor_seguro(
            datos.get("humedad_pct")
        )
    }

    with bloqueo:
        periodo["total"] += 1
        periodo["invalidas"] += 1
        periodo["eventos"].append(evento)

    logger.warning("Lectura invalida: %s", motivos)


# ==========================================
# PROCESAMIENTO DE LECTURAS
# ==========================================

def procesar_lectura(datos):

    if datos.get("device_id") != DEVICE_ID:
        logger.warning("Dispositivo no reconocido")
        return

    # Errores enviados por adquisicion
    if datos.get("tipo") == "error_lectura":
        registrar_invalida(
            datos,
            [str(datos.get("motivo") or "Error de sensor")]
        )
        return

    temperatura = datos.get("temperatura_c")
    humedad = datos.get("humedad_pct")

    # Validacion del tipo de datos
    if (
        isinstance(temperatura, bool)
        or isinstance(humedad, bool)
        or not isinstance(temperatura, (int, float))
        or not isinstance(humedad, (int, float))
    ):
        registrar_invalida(
            datos,
            ["Temperatura o humedad no numerica"]
        )
        return

    # Validacion de valores finitos
    if (
        not math.isfinite(temperatura)
        or not math.isfinite(humedad)
    ):
        registrar_invalida(
            datos,
            ["Valor numerico no finito"]
        )
        return

    # Validacion de rangos fisicos del DHT22
    if (
        not (-40 <= temperatura <= 80)
        or not (0 <= humedad <= 100)
    ):
        registrar_invalida(
            datos,
            ["Medicion fuera del rango del sensor"]
        )
        return

    # VPD solo para lecturas validas; no altera umbrales ni buzzer.
    vpd = calcular_vpd(temperatura, humedad)

    # ======================================
    # DETECCION DE ALERTAS
    # ======================================

    motivos = []

    if temperatura < TEMP_MIN:
        motivos.append("Temperatura baja")
    elif temperatura > TEMP_MAX:
        motivos.append("Temperatura alta")

    if humedad < HUM_MIN:
        motivos.append("Humedad baja")
    elif humedad > HUM_MAX:
        motivos.append("Humedad alta")

    # ======================================
    # REGISTRO DE DATOS VALIDOS
    # ======================================

    with bloqueo:
        periodo["total"] += 1

        periodo["temperaturas"].append(temperatura)
        periodo["humedades"].append(humedad)
        periodo["vpds"].append(vpd)

        if datos.get("simulado") is True:
            periodo["simuladas"] += 1

        if motivos:
            periodo["alertas"] += 1

            disparar_alarma_async()
            periodo["buzzer_activo"] = True
            
            periodo["eventos"].append({
                "id_lectura": str(
                    datos.get("id_lectura") or uuid.uuid4()
                ),
                "timestamp": (
                    datos.get("timestamp") or fecha_actual()
                ),
                "sensor": datos.get("sensor", "DHT22"),
                "estado": "alerta",
                "motivos": motivos,
                "temperatura_c": round(
                    temperatura, DECIMALES
                ),
                "humedad_pct": round(
                    humedad, DECIMALES
                )
            })

        else:
            periodo["normales"] += 1

    logger.info(
        "Lectura procesada: %s C | %s %% | VPD: %.2f kPa | %s",
        round(temperatura, DECIMALES),
        round(humedad, DECIMALES),
        vpd,
        "alerta" if motivos else "normal"
    )


# ==========================================
# RECEPCION MQTT
# ==========================================

def on_connect(
    cliente, userdata, flags, reason_code, properties
):
    if reason_code == 0:
        cliente.subscribe(MQTT_TOPIC_ENTRADA, qos=1)

        logger.info(
            "Suscrito a %s",
            MQTT_TOPIC_ENTRADA
        )
    else:
        logger.error(
            "Error de conexion MQTT: %s",
            reason_code
        )


def on_message(cliente, userdata, mensaje):
    try:
        datos = json.loads(
            mensaje.payload.decode("utf-8")
        )

        if not isinstance(datos, dict):
            raise ValueError("Mensaje JSON invalido")

        procesar_lectura(datos)

    except (
        UnicodeDecodeError,
        json.JSONDecodeError,
        ValueError
    ) as error:
        logger.warning(
            "Mensaje MQTT incorrecto: %s", error
        )


# ==========================================
# GENERACION DEL RESUMEN
# ==========================================

def crear_resumen(datos):

    temperaturas = datos["temperaturas"]
    humedades = datos["humedades"]
    vpds = datos["vpds"]

    if datos["alertas"] > 0:
        estado = "alerta"
    elif datos["invalidas"] > 0:
        estado = "con_errores"
    else:
        estado = "normal"

    if temperaturas:
        resumen_temperatura = {
            "promedio": round(
                sum(temperaturas) / len(temperaturas),
                DECIMALES
            ),
            "minima": round(
                min(temperaturas), DECIMALES
            ),
            "maxima": round(
                max(temperaturas), DECIMALES
            )
        }

        resumen_humedad = {
            "promedio": round(
                sum(humedades) / len(humedades),
                DECIMALES
            ),
            "minima": round(
                min(humedades), DECIMALES
            ),
            "maxima": round(
                max(humedades), DECIMALES
            )
        }

    else:
        resumen_temperatura = {
            "promedio": None,
            "minima": None,
            "maxima": None
        }

        resumen_humedad = {
            "promedio": None,
            "minima": None,
            "maxima": None
        }

    resumen_vpd = {
        "promedio": round(sum(vpds) / len(vpds), DECIMALES_VPD) if vpds else None,
        "minima": round(min(vpds), DECIMALES_VPD) if vpds else None,
        "maxima": round(max(vpds), DECIMALES_VPD) if vpds else None
    }

    return {
        "id_resumen": str(uuid.uuid4()),
        "tipo": "resumen_minuto",
        "device_id": DEVICE_ID,
        "timestamp": fecha_actual(),
        "periodo_segundos": INTERVALO_RESUMEN,
        "estado": estado,

        "conteos": {
            "total": datos["total"],
            "normales": datos["normales"],
            "alertas": datos["alertas"],
            "invalidas": datos["invalidas"],
            "simuladas": datos["simuladas"]
        },

        "temperatura_c": resumen_temperatura,
        "humedad_pct": resumen_humedad,
        "vpd_kpa": resumen_vpd,
        "buzzer_activo": datos["buzzer_activo"],
        "eventos": datos["eventos"]
    }


# ==========================================
# PUBLICACION DEL RESUMEN
# ==========================================

def publicar_resumen(cliente, resumen):

    if not cliente.is_connected():
        logger.warning(
            "MQTT desconectado. Resumen no enviado"
        )
        return False

    mensaje = json.dumps(
        resumen,
        ensure_ascii=False,
        allow_nan=False
    )

    resultado = cliente.publish(
        MQTT_TOPIC_SALIDA,
        payload=mensaje,
        qos=1
    )

    try:
        resultado.wait_for_publish(timeout=5)
    except RuntimeError as error:
        logger.error("Error publicando resumen: %s", error)
        return False

    if resultado.is_published():
        logger.info(
            "Resumen publicado: %s", mensaje
        )
        return True

    logger.warning("Publicacion no confirmada")
    return False


# ==========================================
# CIERRE DEL MICROSERVICIO
# ==========================================

def cerrar_servicio(signum, frame):
    detener.set()


# ==========================================
# PROGRAMA PRINCIPAL
# ==========================================

def main():
    global periodo

    signal.signal(signal.SIGINT, cerrar_servicio)
    signal.signal(signal.SIGTERM, cerrar_servicio)

    cliente = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"procesamiento-{DEVICE_ID}"
    )

    cliente.on_connect = on_connect
    cliente.on_message = on_message

    cliente.reconnect_delay_set(
        min_delay=1,
        max_delay=30
    )

    cliente.connect_async(MQTT_HOST, MQTT_PORT, 60)
    cliente.loop_start()

    logger.info("Microservicio de procesamiento iniciado")
    logger.info(
        "Generando resumen cada %s segundos",
        INTERVALO_RESUMEN
    )

    try:
        while not detener.wait(INTERVALO_RESUMEN):

            Path("/tmp/latido").touch()

            with bloqueo:
                datos_periodo = periodo
                periodo = nuevo_periodo()

            if datos_periodo["total"] == 0:
                logger.info("Periodo sin lecturas")
                continue

            resumen = crear_resumen(datos_periodo)
            publicar_resumen(cliente, resumen)

    finally:
        cliente.disconnect()
        cliente.loop_stop()

        try:
            pwm.stop()
            GPIO.cleanup()
        except Exception:
            pass

        logger.info("Microservicio finalizado")


if __name__ == "__main__":
    main()
