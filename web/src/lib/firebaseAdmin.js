import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Conexion a Firebase con la cuenta de servicio (clave privada).
// Las credenciales SOLO existen como variables de entorno en Vercel (o en .env.local para probar).
function obtenerApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY",
    );
  }

  return initializeApp({
    credential: cert({
      projectId: projectId,
      clientEmail: clientEmail,
      // En las variables de entorno los saltos de linea vienen escritos como \n
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

export function db() {
  return getFirestore(obtenerApp());
}

export function auth() {
  return getAuth(obtenerApp());
}
