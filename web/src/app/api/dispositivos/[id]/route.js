import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { usuarioDeSesion, respuestaDeSesion } from "@/lib/sesion";

// Revoca o reactiva un dispositivo (solo admin): { accion: "revocar" | "reactivar" }
export async function PATCH(request, { params }) {
  try {
    await usuarioDeSesion(request, true);

    const { id } = await params;
    const { accion } = await request.json().catch(() => ({}));
    if (accion !== "revocar" && accion !== "reactivar") {
      return NextResponse.json({ error: "Accion no reconocida" }, { status: 400 });
    }

    const referencia = db().collection("dispositivos").doc(id);
    if (!(await referencia.get()).exists) {
      return NextResponse.json({ error: "Dispositivo no encontrado" }, { status: 404 });
    }

    await referencia.update({ activo: accion === "reactivar" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const sinSesion = respuestaDeSesion(error);
    if (sinSesion) return sinSesion;
    console.error("Error modificando dispositivo:", error);
    return NextResponse.json({ error: "No se pudo modificar el dispositivo" }, { status: 500 });
  }
}
