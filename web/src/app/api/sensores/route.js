import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // 1. Leer el JSON que envía el microservicio de la Raspberry Pi
    const body = await request.json();
    const { deviceToken, sensores, timestamp } = body;

    // 2. Validar el token del dispositivo (Seguridad del proyecto)
    // El token real debe estar guardado en las Variables de Entorno de Vercel
    const tokenValido =
      process.env.DEVICE_SECRET_TOKEN || "token_de_prueba_123";

    if (deviceToken !== tokenValido) {
      return NextResponse.json(
        { error: "No autorizado: Token de dispositivo inválido" },
        { status: 401 },
      );
    }

    // 3. Validar que lleguen los datos de los sensores
    if (!sensores || sensores.length === 0) {
      return NextResponse.json(
        { error: "Faltan los datos de los sensores" },
        { status: 400 },
      );
    }

    // 4. AQUÍ SE CONECTARÁ FIRESTORE (lo que está haciendo tu compañero)
    // Ejemplo de lo que irá aquí cuando tu compañero te pase la config:
    /*
      await db.collection('lecturas').add({
        deviceToken,
        sensores,
        timestamp: timestamp || new Date().toISOString()
      });
    */
    console.log(
      "Datos recibidos exitosamente desde la Raspberry Pi:",
      sensores,
    );

    // 5. Responder a la Raspberry Pi que todo salió bien
    return NextResponse.json(
      { success: true, message: "Datos recibidos y guardados correctamente" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error en la API de sensores:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
