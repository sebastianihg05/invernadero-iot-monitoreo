import { NextResponse, connection } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { respuestaDeSesion, usuarioDeSesion } from "@/lib/sesion";
import { estadoLecturas, registrarLecturas } from "@/lib/limiteLecturas";
import { procesarResumenes } from "@/lib/procesarResumenes";

// GET /api/admin/historial?days=N (solo admin): todas las mediciones de los ultimos N dias (8 a 30).
// Lee 1 documento por minuto (30 dias = ~43.200 lecturas), por eso:
// - primero cuenta los documentos con count() (1 lectura por cada 1.000) y rechaza si superan lo que
//   queda del tope diario de lib/limiteLecturas.js (FIRESTORE_MAX_DOCS_POR_DIA, 25.000 por defecto);
// - responde las mediciones como filas compactas [segundos, temp, humedad, vpd, alertas, invalidas, estado]
//   porque en formato normal 30 dias pesan ~8 MB y Vercel corta las respuestas sobre 4,5 MB.
const MIN_DIAS = 8;
const MAX_DIAS = 30;
const MAX_ALERTAS = 2000;

export async function GET(request) {
  // Siempre en cada peticion: depende de la sesion (sin esto Next intenta pre-renderizarla en el build)
  await connection();
  try {
    await usuarioDeSesion(request, true);

    const dias = Number(new URL(request.url).searchParams.get("days") ?? "30");
    if (!Number.isInteger(dias) || dias < MIN_DIAS || dias > MAX_DIAS) {
      return NextResponse.json(
        { error: `El período debe ser de ${MIN_DIAS} a ${MAX_DIAS} días.` },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const now = Date.now();
    const deviceId = process.env.DEVICE_ID || "invernadero-01";
    const consulta = db()
      .collection("dispositivos")
      .doc(deviceId)
      .collection("resumenes")
      .where("timestamp", ">=", new Date(now - dias * 24 * 60 * 60 * 1000).toISOString())
      .where("timestamp", "<=", new Date(now).toISOString());

    const total = (await consulta.count().get()).data().count;
    registrarLecturas(Math.max(1, Math.ceil(total / 1000)), now);

    const uso = estadoLecturas(now);
    if (total > uso.restantes) {
      return NextResponse.json(
        {
          error:
            `La consulta necesita ${total.toLocaleString("es-CL")} lecturas y hoy quedan ` +
            `${uso.restantes.toLocaleString("es-CL")} disponibles. Prueba con menos días.`,
        },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }

    const documentos = total === 0 ? [] : (await consulta.orderBy("timestamp", "desc").limit(total).get()).docs;
    registrarLecturas(documentos.length, now);

    const { summaries, alerts, counts } = procesarResumenes(documentos);
    const filas = summaries.map((r) => [
      Math.round(Date.parse(r.timestamp) / 1000),
      r.temperatura_c,
      r.humedad_pct,
      r.vpd_kpa,
      r.alertas,
      r.invalidas,
      r.estado,
    ]);

    return NextResponse.json(
      { days: dias, filas, counts, alerts: alerts.slice(0, MAX_ALERTAS) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const sinSesion = respuestaDeSesion(error);
    if (sinSesion) return sinSesion;
    console.error("Error consultando el historial extendido:", error);
    return NextResponse.json(
      { error: "No se pudo consultar el historial extendido." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
