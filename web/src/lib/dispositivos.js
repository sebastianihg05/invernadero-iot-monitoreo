import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/firebaseAdmin";

// El token de cada dispositivo es "<id>.<secreto>". En Firestore solo se guarda el hash del secreto.
const hash = (texto) => createHash("sha256").update(texto).digest("hex");

export const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;

export function tokenDeCabecera(cabecera) {
  return cabecera && cabecera.startsWith("Bearer ") ? cabecera.slice(7).trim() : "";
}

export function nuevoToken(id) {
  const secreto = randomBytes(32).toString("hex");
  return { token: id + "." + secreto, tokenHash: hash(secreto) };
}

// Token global antiguo (DEVICE_SECRET_TOKEN), solo mientras exista la variable
export function tokenGlobalCoincide(token, esperado) {
  return Boolean(token && esperado) && hash(token) === hash(esperado);
}

// Devuelve { deviceId } si el token es de un dispositivo activo, o { estado, error }
export async function autenticarDispositivo(token) {
  const punto = token.indexOf(".");
  const deviceId = token.slice(0, punto);
  const secreto = token.slice(punto + 1);

  if (punto < 1 || !ID_VALIDO.test(deviceId)) return { estado: 401, error: "Token invalido" };

  const doc = await db().collection("dispositivos").doc(deviceId).get();
  if (!doc.exists || doc.data().tokenHash !== hash(secreto)) return { estado: 401, error: "Token invalido" };
  if (doc.data().activo === false) return { estado: 403, error: "Dispositivo revocado" };

  return { deviceId };
}
