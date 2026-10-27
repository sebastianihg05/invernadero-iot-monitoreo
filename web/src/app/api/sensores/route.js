import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { autenticarDispositivo, tokenDeCabecera, tokenGlobalCoincide } from "@/lib/dispositivos";
import { respuestaDeSesion, usuarioDeSesion } from "@/lib/sesion";
import { estadoLecturas, registrarLecturas } from "@/lib/limiteLecturas";
import { procesarResumenes } from "@/lib/procesarResumenes";

// Control de lecturas de Firestore: cada documento leido cuenta como 1 lectura (cuota gratuita: 50.000 al dia).
// 1) Cache en memoria por rango: repetir la consulta dentro de este tiempo NO vuelve a leer Firestore.
//    En 1 hora es corta (1 min) para que el estado "datos recientes" del panel siga siendo fiel.
const CACHE_MS = { "1h": 60 * 1000, "24h": 30 * 60 * 1000, "7d": 2 * 60 * 60 * 1000 };
const cache = new Map();
// 2) Tope diario de documentos leidos (lib/limiteLecturas.js, compartido con /api/admin/historial): al llegar
//    a el, se responde con el dato guardado en cache (aunque este vencido) y, si no hay, con error 429.

// GET de lectura (requiere sesion): expone datos resumidos para el período solicitado.
export async function GET(request) {
  try {
    // Solo usuarios con sesion (admin o estudiante). Se verifica antes de usar la cache.
    await usuarioDeSesion(request);

    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "24h";
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

    // Cache y tope diario (ver arriba)
    const uso = estadoLecturas(now);
    const clave = deviceId + ":" + range;
    const guardada = cache.get(clave);

    if (guardada && (guardada.hasta > now || uso.restantes <= 0)) {
      return NextResponse.json(guardada.respuesta, { headers: { "Cache-Control": "no-store" } });
    }
    if (uso.restantes <= 0) {
      return NextResponse.json(
        { error: "Se alcanzo el limite diario de lecturas del panel. Vuelve a intentarlo manana." },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }

    const snapshot = await db()
      .collection("dispositivos")
      .doc(deviceId)
      .collection("resumenes")
      .where("timestamp", ">=", cutoff)
      .where("timestamp", "<=", new Date(now).toISOString())
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();
    registrarLecturas(snapshot.size, now);

    const { summaries, alerts, counts } = procesarResumenes(snapshot.docs);
    const respuesta = {
      range,
      summaries,
      counts,
      alerts: alerts.slice(0, 8),
    };
    cache.set(clave, { hasta: now + CACHE_MS[range], respuesta });

    return NextResponse.json(respuesta, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const sinSesion = respuestaDeSesion(error);
    if (sinSesion) return sinSesion;
    console.error("Error consultando los resúmenes de sensores:", error);
    return NextResponse.json(
      { error: "No se pudieron consultar las mediciones" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

// POST /api/sensores: recibe de la Raspberry un resumen por minuto y lo guarda en Firestore.
// Authorization: Bearer <id>.<secreto>. Mientras exista DEVICE_SECRET_TOKEN tambien se acepta ese token.
export async function POST(request) {
  try {
    const token = tokenDeCabecera(request.headers.get("authorization"));
    const acceso = await autenticarDispositivo(token);

    if (!acceso.deviceId) {
      if (acceso.estado === 403) return NextResponse.json({ error: acceso.error }, { status: 403 });
      if (!tokenGlobalCoincide(token, process.env.DEVICE_SECRET_TOKEN)) {
        return NextResponse.json({ error: "No autorizado: token de dispositivo invalido" }, { status: 401 });
      }
    }

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
    // con token propio solo se puede guardar a nombre del mismo dispositivo
    if (acceso.deviceId && acceso.deviceId !== deviceId) {
      return NextResponse.json({ error: "El token no corresponde a ese dispositivo" }, { status: 403 });
    }

    // set() con ese id: si la Raspberry reenvia tras un corte, no se duplica
    const dispositivo = db().collection("dispositivos").doc(deviceId);
    const lote = db().batch();
    lote.set(dispositivo.collection("resumenes").doc(idResumen), resumen);
    if (acceso.deviceId) lote.update(dispositivo, { lastSeenAt: FieldValue.serverTimestamp() });
    await lote.commit();

    return NextResponse.json({ success: true, id_resumen: idResumen }, { status: 200 });
  } catch (error) {
    console.error("Error en la API de sensores:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
