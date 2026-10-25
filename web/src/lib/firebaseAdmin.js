import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminApp;

function getCredentials() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    try {
      return JSON.parse(serviceAccountJson);
    } catch {
      // Ignorar error de parseo y continuar con fallback
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (clientEmail && privateKey && projectId) {
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

export function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const credentials = getCredentials();

  if (!credentials) {
    console.warn("Firebase Admin SDK: No credentials found");
    return null;
  }

  adminApp = initializeApp({
    credential: cert(credentials),
  });

  return adminApp;
}

export function db() {
  const app = initAdmin();
  if (!app) {
    throw new Error("Firebase Admin not initialized");
  }
  return getFirestore(app);
}

export function auth() {
  const app = initAdmin();
  if (!app) {
    throw new Error("Firebase Admin not initialized");
  }
  return getAuth(app);
}