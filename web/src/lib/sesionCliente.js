import { auth } from "@/lib/firebaseClient";

// fetch con el token de sesion de Firebase (la API lo verifica en el servidor)
export async function fetchConSesion(url, opciones = {}) {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("Inicia sesión para continuar.");

  const token = await auth.currentUser.getIdToken();
  return fetch(url, { ...opciones, headers: { ...opciones.headers, Authorization: "Bearer " + token } });
}
