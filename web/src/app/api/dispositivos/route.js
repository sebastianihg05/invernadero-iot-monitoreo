import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { usuarioDeSesion, respuestaDeSesion } from "@/lib/sesion";
import { ID_VALIDO, nuevoToken } from "@/lib/dispositivos";

// Lista los dispositivos (solo admin). No devuelve el hash del token.
export async function GET(request) {
  try {
    await usuarioDeSesion(request, true);

    const snapshot = await db().collection("dispositivos").get();
    const dispositivos = snapshot.docs
      .filter((doc) => doc.data().tokenHash)
      .map((doc) => {
        const d = doc.data();
        const ultima = d.lastSeenAt ? d.lastSeenAt.toDate() : null;
        return {
          id: doc.id,
          nombre: d.nombre,
          activo: d.activo !== false,
          // en linea si envio datos hace menos de 3 minutos
          enLinea: Boolean(ultima) && Date.now() - ultima.getTime() < 3 * 60 * 1000,
          lastSeenAt: ultima ? ultima.toISOString() : null,
        };
      });

    return NextResponse.json({ dispositivos });
  } catch (error) {
    const sinSesion = respuestaDeSesion(error);
    if (sinSesion) return sinSesion;
    console.error("Error listando dispositivos:", error);
    return NextResponse.json({ error: "No se pudieron consultar los dispositivos" }, { status: 500 });
  }
}

// Registra un dispositivo (solo admin) y devuelve su token una sola vez
export async function POST(request) {
  try {
    await usuarioDeSesion(request, true);

    const { id, nombre } = await request.json().catch(() => ({}));
    if (!ID_VALIDO.test(id)) {
      return NextResponse.json({ error: "Identificador invalido (letras, numeros, - y _)" }, { status: 400 });
    }
    if (typeof nombre !== "string" || !nombre.trim() || nombre.length > 80) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const { token, tokenHash } = nuevoToken(id);
    try {
      // create() falla si ya existe, asi no se pisa un dispositivo registrado
      await db().collection("dispositivos").doc(id).create({
        nombre: nombre.trim(),
        tokenHash,
        activo: true,
        lastSeenAt: null,
        creado: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if (error.code === 6) return NextResponse.json({ error: "Ese identificador ya existe" }, { status: 409 });
      throw error;
    }

    return NextResponse.json({ id, token }, { status: 201 });
  } catch (error) {
    const sinSesion = respuestaDeSesion(error);
    if (sinSesion) return sinSesion;
    console.error("Error registrando dispositivo:", error);
    return NextResponse.json({ error: "No se pudo registrar el dispositivo" }, { status: 500 });
  }
}
