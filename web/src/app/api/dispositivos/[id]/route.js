import { NextResponse } from "next/server";
import { verificarSesionUsuario } from "@/lib/dispositivos";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(req, context) {
  try {
    const params = await context.params;
    const { id } = params;
    const body = await req.json();
    const { accion, config } = body;

    const deviceRef = db().collection("dispositivos").doc(id);
    const doc = await deviceRef.get();

    if (!doc.exists) {
      return NextResponse.json({ ok: false, error: "Dispositivo no encontrado" }, { status: 404 });
    }

    if (accion === "revocar") {
      await deviceRef.update({
        activo: false,
        revokedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ ok: true, message: `Dispositivo ${id} revocado` });
    }

    if (accion === "reactivar") {
      await deviceRef.update({
        activo: true,
      });
      return NextResponse.json({ ok: true, message: `Dispositivo ${id} reactivado` });
    }

    if (accion === "configurar" && config) {
      const updates = {};
      if (config.intervaloMuestreoSeg !== undefined) updates["config.intervaloMuestreoSeg"] = Number(config.intervaloMuestreoSeg);
      if (config.intervaloEnvioSeg !== undefined) updates["config.intervaloEnvioSeg"] = Number(config.intervaloEnvioSeg);
      if (config.tempMax !== undefined) updates["config.umbrales.tempMax"] = Number(config.tempMax);
      if (config.tempMin !== undefined) updates["config.umbrales.tempMin"] = Number(config.tempMin);
      if (config.humedadMin !== undefined) updates["config.umbrales.humedadMin"] = Number(config.humedadMin);

      await deviceRef.update(updates);
      return NextResponse.json({ ok: true, message: `Configuración actualizada para ${id}` });
    }

    return NextResponse.json({ ok: false, error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}