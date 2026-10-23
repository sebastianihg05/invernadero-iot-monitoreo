import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

// GET público de solo lectura: expone datos resumidos para el período solicitado.
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "7d";
    if (!["1h", "24h", "7d"].includes(range)) {
      return NextResponse.json(
        { error: "El período debe ser 1h, 24h o 7d" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const now = Date.now();
    const windowMs =
      range === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : range === "24h"
          ? 24 * 60 * 60 * 1000
          : 60 * 60 * 1000;
    const cutoff = new Date(now - windowMs).toISOString();
    const limit = range === "7d" ? 10080 : range === "24h" ? 1440 : 60;
    const deviceId = process.env.DEVICE_ID || "invernadero-01";
    const snapshot = await db()
      .collection("dispositivos")
      .doc(deviceId)
      .collection("resumenes")
      .where("timestamp", ">=", cutoff)
      .where("timestamp", "<=", new Date(now).toISOString())
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    let alertCount = 0;
    let invalidCount = 0;
    const alerts = [];
    const summaries = snapshot.docs.flatMap((document) => {
      const data = document.data();
      const counts =
        data.conteos && typeof data.conteos === "object" ? data.conteos : {};
      const temperature =
        data.temperatura_c && typeof data.temperatura_c === "object"
          ? data.temperatura_c.promedio
          : null;
      const humidity =
        data.humedad_pct && typeof data.humedad_pct === "object"
          ? data.humedad_pct.promedio
          : null;

      if (
        typeof data.timestamp !== "string" ||
        !Number.isFinite(Date.parse(data.timestamp))
      ) {
        return [];
      }

      if (Number.isSafeInteger(counts.alertas) && counts.alertas > 0) {
        alertCount += counts.alertas;
      }
      if (Number.isSafeInteger(counts.invalidas) && counts.invalidas > 0) {
        invalidCount += counts.invalidas;
      }

      if (Array.isArray(data.eventos)) {
        data.eventos.forEach((event, index) => {
          if (
            !event ||
            typeof event !== "object" ||
            !["alerta", "invalida"].includes(event.estado) ||
            typeof event.timestamp !== "string" ||
            !Number.isFinite(Date.parse(event.timestamp))
          ) {
            return;
          }

          const reasons = Array.isArray(event.motivos)
            ? event.motivos.filter((reason) => typeof reason === "string").slice(0, 5)
            : [];

          alerts.push({
            id: `${document.id}-${index}`,
            timestamp: event.timestamp,
            estado: event.estado,
            motivos: reasons,
          });
        });
      }

      return [
        {
          id: document.id,
          timestamp: data.timestamp,
          estado: typeof data.estado === "string" ? data.estado : "desconocido",
          alertas: Number.isSafeInteger(counts.alertas) ? counts.alertas : 0,
          invalidas: Number.isSafeInteger(counts.invalidas) ? counts.invalidas : 0,
          temperatura_c:
            typeof temperature === "number" && Number.isFinite(temperature)
              ? temperature
              : null,
          humedad_pct:
            typeof humidity === "number" && Number.isFinite(humidity)
              ? humidity
              : null,
        },
      ];
    });

    alerts.sort(
      (first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp),
    );

    return NextResponse.json(
      {
        range,
        summaries,
        counts: { alertas: alertCount, invalidas: invalidCount },
        alerts: alerts.slice(0, 8),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error consultando los resúmenes de sensores:", error);
    return NextResponse.json(
      { error: "No se pudieron consultar las mediciones" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

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
