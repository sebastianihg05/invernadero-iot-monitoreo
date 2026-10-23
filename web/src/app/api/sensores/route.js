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
