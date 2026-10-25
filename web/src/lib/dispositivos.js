import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { db, auth } from "@/lib/firebaseAdmin";

// Hashea el secreto con SHA-256 (nunca guardamos el texto plano en base de datos)
export function hashSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

// Verifica la sesión del admin autenticado en Firebase
export async function verificarSesionUsuario(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No autenticado: falta token de Firebase");
  }
  const idToken = authHeader.split("Bearer ")[1];
  const decoded = await auth().verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email,
    rol: decoded.rol || decoded.role || "viewer",
  };
}

// Valida el token del nodo con formato "id.secreto"
export async function validarTokenDispositivo(rawToken) {
  if (!rawToken || !rawToken.includes(".")) return null;

  const dotIndex = rawToken.indexOf(".");
  const deviceId = rawToken.substring(0, dotIndex);
  const secret = rawToken.substring(dotIndex + 1);

  const doc = await db().collection("dispositivos").doc(deviceId).get();
  if (!doc.exists) return null;

  const data = doc.data();
  if (!data.activo) return null;
  if (data.tokenHash !== hashSecret(secret)) return null;

  return { id: doc.id, ...data };
}

// Registra un nuevo dispositivo generando su secreto criptográfico
export async function crearDispositivo({ id, nombre, config = {} }) {
  const secret = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSecret(secret);
  const rawToken = `${id}.${secret}`;

  const payload = {
    nombre: nombre || id,
    activo: true,
    tokenHash,
    config: {
      intervaloMuestreoSeg: config.intervaloMuestreoSeg ?? 10,
      intervaloEnvioSeg: config.intervaloEnvioSeg ?? 60,
      umbrales: {
        tempMax: config.tempMax ?? 28,
        tempMin: config.tempMin ?? 15,
        humedadMin: config.humedadMin ?? 40,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
    lastSeenAt: null,
  };

  await db().collection("dispositivos").doc(id).set(payload);

  return { id, rawToken, config: payload.config };
}