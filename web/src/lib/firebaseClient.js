import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBeo6oGImF_RJ-VGnE5Q8hr66m2xPS7UWM",
  authDomain: "invernadero-iot-monitore-76e90.firebaseapp.com",
  projectId: "invernadero-iot-monitore-76e90",
  storageBucket: "invernadero-iot-monitore-76e90.firebasestorage.app",
  messagingSenderId: "133026261232",
  appId: "1:133026261232:web:599a2e6eecd80fa522ba35"
};

// Evita inicializar la aplicación múltiples veces en el App Router de Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exporta las instancias para usarlas en tus formularios
export const auth = getAuth(app);
export const db = getFirestore(app);