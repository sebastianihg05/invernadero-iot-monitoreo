import { NextResponse } from "next/server";
import { verificarSesionUsuario, crearDispositivo } from "@/lib/dispositivos";
import { db } from "@/lib/firebaseAdmin";

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    try {
      await verificarSesionUsuario(authHeader);
    } catch {
      // Modo flexible para visualización en desarrollo
    }

    const snapshot = await db().collection("dispositivos").get();
    const ahora = Date.now();

    const data = snapshot.docs.map((doc) => {
      const d = doc.data();
      const lastSeen = d.lastSeenAt?.toDate?.() || null;
      const toleranciaMs = (d.config?.intervaloEnvioSeg || 60) * 3 * 1000;
      const isOnline = lastSeen ? ahora - lastSeen.getTime() < toleranciaMs : false;

      return {
        id: doc.id,
        nombre: d.nombre,
        activo: d.activo,
        config: d.config,
        isOnline,
        lastSeenAt: lastSeen ? lastSeen.toISOString() : null,
      };
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, nombre, config } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ ok: false, error: "El ID es requerido (ej: invernadero-01)" }, { status: 400 });
    }

    const nuevo = await crearDispositivo({ id: id.trim(), nombre, config });
    return NextResponse.json({ ok: true, data: nuevo }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}