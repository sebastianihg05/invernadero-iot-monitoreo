import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { ErrorSesion, respuestaDeSesion, usuarioDeSesion } from "@/lib/sesion";
import { autenticarDispositivo, tokenDeCabecera } from "@/lib/dispositivos";

// Umbrales de alerta. Si nunca se guardaron, son los mismos que trae el data-processor.
const POR_DEFECTO = { temp_min: 18, temp_max: 30, hum_min: 40, hum_max: 80 };
const LIMITES = {
  temp_min: ["temperatura minima", -40, 80],
  temp_max: ["temperatura maxima", -40, 80],
  hum_min: ["humedad minima", 0, 100],
  hum_max: ["humedad maxima", 0, 100],
};

function configuracionDe(deviceId, datos) {
  const guardada = datos?.configuracion || {};
  const config = { device_id: deviceId };
  for (const campo of Object.keys(POR_DEFECTO)) {
    config[campo] = typeof guardada[campo] === "number" ? guardada[campo] : POR_DEFECTO[campo];
  }
  config.actualizado = guardada.actualizado ? guardada.actualizado.toDate().toISOString() : null;
  return config;
}

// GET /api/configuracion: la leen el panel (con sesion) y el uploader de la Raspberry (con su token).
export async function GET(request) {
  try {
    let deviceId = process.env.DEVICE_ID || "invernadero-01";
    let datos;

    try {
      await usuarioDeSesion(request);
    } catch (error) {
      // si no es una sesion valida, puede ser el token de un dispositivo
      if (!(error instanceof ErrorSesion) || error.estado !== 401) throw error;
      const acceso = await autenticarDispositivo(tokenDeCabecera(request.headers.get("authorization")));
      if (!acceso.deviceId) return NextResponse.json({ error: acceso.error }, { status: acceso.estado });
      deviceId = acceso.deviceId;
      datos = acceso.datos;
    }

    if (!datos) datos = (await db().collection("dispositivos").doc(deviceId).get()).data();
    return NextResponse.json(configuracionDe(deviceId, datos), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const sinSesion = respuestaDeSesion(error);
    if (sinSesion) return sinSesion;
    console.error("Error leyendo la configuracion:", error);
    return NextResponse.json({ error: "No se pudo leer la configuracion" }, { status: 500 });
  }
}

// PUT /api/configuracion (solo admin): guarda los umbrales. La Raspberry los baja en menos de un minuto.
export async function PUT(request) {
  try {
    const { uid } = await usuarioDeSesion(request, true);

    const cuerpo = await request.json().catch(() => null);
    const nueva = {};
    for (const [campo, [nombre, min, max]] of Object.entries(LIMITES)) {
      const valor = cuerpo?.[campo];
      if (typeof valor !== "number" || !Number.isFinite(valor) || valor < min || valor > max) {
        return NextResponse.json({ error: "Valor invalido: " + nombre + " (entre " + min + " y " + max + ")" }, { status: 400 });
      }
      nueva[campo] = valor;
    }
    if (nueva.temp_min >= nueva.temp_max || nueva.hum_min >= nueva.hum_max) {
      return NextResponse.json({ error: "El minimo debe ser menor que el maximo" }, { status: 400 });
    }

    const deviceId = process.env.DEVICE_ID || "invernadero-01";
    await db().collection("dispositivos").doc(deviceId).set(
      { configuracion: { ...nueva, actualizado: FieldValue.serverTimestamp(), actualizadoPor: uid } },
      { merge: true },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const sinSesion = respuestaDeSesion(error);
    if (sinSesion) return sinSesion;
    console.error("Error guardando la configuracion:", error);
    return NextResponse.json({ error: "No se pudo guardar la configuracion" }, { status: 500 });
  }
}