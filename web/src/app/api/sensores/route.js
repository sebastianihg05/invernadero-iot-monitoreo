import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { validarTokenDispositivo } from "@/lib/dispositivos";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req) {
  try {
    const firestore = db();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    let query = firestore.collection("lecturas").orderBy("timestamp", "desc");

    if (desde) query = query.where("timestamp", ">=", new Date(desde));
    if (hasta) query = query.where("timestamp", "<=", new Date(hasta));

    const snapshot = await query.limit(Math.min(limit, 100)).get();

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const rawToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const dispositivo = await validarTokenDispositivo(rawToken);
    if (!dispositivo) {
      return NextResponse.json(
        { ok: false, error: "Dispositivo no autorizado o token revocado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { temperatura, humedad } = body;

    if (typeof temperatura !== "number" || typeof humedad !== "number") {
      return NextResponse.json(
        { ok: false, error: "Datos de telemetría inválidos" },
        { status: 400 }
      );
    }

    const firestore = db();
    const batch = firestore.batch();

    // 1. Guardar la lectura
    const lecturaRef = firestore.collection("lecturas").doc();
    batch.set(lecturaRef, {
      deviceId: dispositivo.id,
      temperatura,
      humedad,
      timestamp: FieldValue.serverTimestamp(),
    });

    // 2. Heartbeat: actualiza lastSeenAt en el mismo batch (sin costo extra de escritura)
    const deviceRef = firestore.collection("dispositivos").doc(dispositivo.id);
    batch.update(deviceRef, {
      lastSeenAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({ ok: true, message: "Telemetría registrada" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}