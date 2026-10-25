import { NextResponse } from "next/server";
import { validarTokenDispositivo } from "@/lib/dispositivos";

export async function GET(req, context) {
  try {
    const authHeader = req.headers.get("authorization");
    const rawToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const dispositivo = await validarTokenDispositivo(rawToken);
    const params = await context.params;

    if (!dispositivo || dispositivo.id !== params.id) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      data: dispositivo.config,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}