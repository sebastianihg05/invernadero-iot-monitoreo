import { NextResponse } from "next/server";
import { auth, db } from "@/lib/firebaseAdmin";
import { tokenDeCabecera } from "@/lib/dispositivos";

export class ErrorSesion extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// Verifica el token de sesion de Firebase y lee el rol en usuarios/{uid}.rol.
// Con soloAdmin exige el rol "admin". Devuelve { uid, rol } o lanza ErrorSesion.
export async function usuarioDeSesion(request, soloAdmin = false) {
  const token = tokenDeCabecera(request.headers.get("authorization"));
  if (!token) throw new ErrorSesion(401, "Inicia sesion para continuar.");

  let uid;
  try {
    uid = (await auth().verifyIdToken(token)).uid;
  } catch {
    throw new ErrorSesion(401, "La sesion no es valida.");
  }

  const doc = await db().collection("usuarios").doc(uid).get();
  const rol = doc.exists ? doc.data().rol : null;
  if (rol !== "admin" && rol !== "estudiante") throw new ErrorSesion(403, "Tu cuenta no tiene acceso.");
  if (soloAdmin && rol !== "admin") throw new ErrorSesion(403, "Solo un administrador puede hacer esto.");

  return { uid, rol };
}

// Para el catch de una ruta: si el error es de sesion devuelve la respuesta 401/403; si no, null.
export function respuestaDeSesion(error) {
  return error instanceof ErrorSesion
    ? NextResponse.json({ error: error.message }, { status: error.estado })
    : null;
}
