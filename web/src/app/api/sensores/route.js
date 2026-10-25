import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

// POST /api/sensores
// Recibe de la Raspberry Pi (servicio uploader) UN resumen por minuto y lo guarda en Firestore.
// Header obligatorio:  Authorization: Bearer <DEVICE_SECRET_TOKEN>
export async function POST(request) {
  try {
    // 1. Validar el token del dispositivo.
    //    No hay valor por defecto: si la variable no existe en Vercel, la ruta no acepta nada.
    const tokenEsperado = process.env.DEVICE_SECRET_TOKEN;

    if (!tokenEsperado) {
      console.error("Falta la variable DEVICE_SECRET_TOKEN");
      return NextResponse.json(
        { error: "Servidor sin token configurado" },
        { status: 500 },
      );
    }

    const cabecera = request.headers.get("authorization") || "";

    if (cabecera !== "Bearer " + tokenEsperado) {
      return NextResponse.json(
        { error: "No autorizado: token de dispositivo invalido" },
        { status: 401 },
      );
    }

    // 2. Leer y validar el resumen que publica el data-processor
    const resumen = await request.json();

    if (!resumen || typeof resumen !== "object" || Array.isArray(resumen)) {
      return NextResponse.json({ error: "JSON incorrecto" }, { status: 400 });
    }

    const idResumen = resumen.id_resumen;
    const deviceId = resumen.device_id;

    if (typeof idResumen !== "string" || idResumen.length < 1 || idResumen.length > 128) {
      return NextResponse.json({ error: "id_resumen invalido" }, { status: 400 });
    }

    if (typeof deviceId !== "string" || deviceId.length < 1 || deviceId.length > 64) {
      return NextResponse.json({ error: "device_id invalido" }, { status: 400 });
    }

    if (typeof resumen.timestamp !== "string") {
      return NextResponse.json({ error: "Falta el timestamp" }, { status: 400 });
    }

    // 3. Guardar en Firestore: dispositivos/{device_id}/resumenes/{id_resumen}
    //    Se usa set() con id_resumen como id del documento: si la Raspberry reenvia
    //    el mismo resumen despues de un corte, se sobrescribe y NO se duplica.
    await db()
      .collection("dispositivos")
      .doc(deviceId)
      .collection("resumenes")
      .doc(idResumen)
      .set(resumen);

    // 4. Responder a la Raspberry Pi solo cuando ya quedo guardado
    return NextResponse.json({ success: true, id_resumen: idResumen }, { status: 200 });
  } catch (error) {
    console.error("Error en la API de sensores:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// GET /api/sensores?range=1h|24h|7d
// Primer paso de integracion: lectura de resumenes REALES del DHT22.
// IMPORTANTE: este GET solo se habilita expresamente en Next.js Desarrollo.
// Falta integrar Firebase Auth y la autorizacion por organizacion antes de publicar lecturas.
const PERIODOS_MS = { "1h": 60 * 60 * 1000, "24h": 24 * 60 * 60 * 1000, "7d": 7 * 24 * 60 * 60 * 1000 };
const MAX_RESUMENES = 120; // Limite deliberado para controlar lecturas de Firestore en la primera prueba.

function valorNumerico(valor) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function enteroNoNegativo(valor) {
  return Number.isSafeInteger(valor) && valor >= 0 ? valor : 0;
}

function convertirResumen(doc) {
  const origen = doc.data();
  const timestamp = origen.timestamp;
  if (typeof timestamp !== "string" || !Number.isFinite(Date.parse(timestamp))) return null;

  const conteos = origen.conteos && typeof origen.conteos === "object" ? origen.conteos : {};
  return {
    id: doc.id,
    timestamp: new Date(timestamp).toISOString(),
    estado: typeof origen.estado === "string" ? origen.estado : "sin_estado",
    alertas: enteroNoNegativo(conteos.alertas),
    invalidas: enteroNoNegativo(conteos.invalidas),
    temperatura_c: valorNumerico(origen.temperatura_c?.promedio),
    humedad_pct: valorNumerico(origen.humedad_pct?.promedio),
    // El resumen actual no incluye el estado del KY-006: no se inventa.
    buzzer_activo: typeof origen.buzzer_activo === "boolean" ? origen.buzzer_activo : null,
  };
}

export async function GET(request) {
  // No publicar una lectura abierta a Internet sin autenticacion/autorizacion.
  // Este modo temporal sirve SOLO para realizar pruebas en el Replit de desarrollo.
  if (process.env.NODE_ENV !== "development" || process.env.DEV_SENSOR_READS !== "true") {
    return NextResponse.json(
      { error: "Lectura no habilitada. Falta integrar la autenticacion de usuarios y permisos." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rango = new URL(request.url).searchParams.get("range") || "24h";
  if (!Object.hasOwn(PERIODOS_MS, rango)) {
    return NextResponse.json({ error: "Rango invalido. Usa 1h, 24h o 7d." }, { status: 400 });
  }

  const deviceId = process.env.SENSOR_DEVICE_ID || "invernadero-01";
  const inicio = Date.now() - PERIODOS_MS[rango];

  try {
    const snapshot = await db()
      .collection("dispositivos")
      .doc(deviceId)
      .collection("resumenes")
      .orderBy("timestamp", "desc")
      .limit(MAX_RESUMENES)
      .get();

    const summaries = snapshot.docs
      .map(convertirResumen)
      .filter((dato) => dato !== null && Date.parse(dato.timestamp) >= inicio)
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

    // "eventos" no tiene una estructura confirmada en las capturas.
    // No generamos alertas ficticias a partir de los conteos.
    return NextResponse.json({
      summaries,
      alerts: [],
      counts: { alertas: 0, invalidas: 0 },
      meta: {
        deviceId,
        range: rango,
        maxRegistros: MAX_RESUMENES,
        limiteAlcanzado: snapshot.size === MAX_RESUMENES,
        nota: "Primera integracion: solo los ultimos resumenes; alertas detalladas pendientes.",
      },
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("Error al consultar resumenes en Firestore:", error);
    return NextResponse.json(
      { error: "No fue posible consultar las mediciones de Firestore." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
