import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { respuestaDeSesion, usuarioDeSesion } from "@/lib/sesion";
import { MODOS, REGLAS } from "@/lib/buzzer";

// PUT /api/buzzer (solo admin). Una orden por llamada:
//   { modo: "auto" | "silenciado" | "activado" }
//   { regla: "temperatura" | "humedad" | "sensor" | "conectividad", activa: true | false }
//   { probar: true }
// Se guarda en la configuracion del dispositivo; el uploader la baja y el data-processor la aplica.
export async function PUT(request) {
  try {
    await usuarioDeSesion(request, true);

    const orden = await request.json().catch(() => null);
    let buzzer;

    if (MODOS.includes(orden?.modo)) {
      buzzer = { modo: orden.modo };
    } else if (REGLAS.includes(orden?.regla) && typeof orden?.activa === "boolean") {
      buzzer = { reglas: { [orden.regla]: orden.activa } };
    } else if (orden?.probar === true) {
      // cada prueba suma 1: la Raspberry suena cuando el numero cambia
      buzzer = { prueba: FieldValue.increment(1) };
    } else {
      return NextResponse.json({ error: "Orden invalida" }, { status: 400 });
    }

    const deviceId = process.env.DEVICE_ID || "invernadero-01";
    await db().collection("dispositivos").doc(deviceId).set({ configuracion: { buzzer } }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    const sinSesion = respuestaDeSesion(error);
    if (sinSesion) return sinSesion;
    console.error("Error enviando la orden al buzzer:", error);
    return NextResponse.json({ error: "No se pudo enviar la orden" }, { status: 500 });
  }
}