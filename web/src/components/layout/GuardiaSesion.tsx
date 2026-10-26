"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";

// Solo deja pasar a quien tiene sesión (y rol "admin" si soloAdmin). La verificación real la hace la API.
export default function GuardiaSesion({ soloAdmin = false, children }: { soloAdmin?: boolean; children: ReactNode }) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) return router.replace("/");

      if (soloAdmin) {
        const snap = await getDoc(doc(db, "usuarios", usuario.uid)).catch(() => null);
        if (snap?.data()?.rol !== "admin") return router.replace("/consulta");
      }
      setAutorizado(true);
    });
  }, [router, soloAdmin]);

  if (!autorizado) return <main style={{ padding: 28, background: "#07171d", color: "#d9f1e8", minHeight: "100vh" }}>Verificando sesión…</main>;
  return <>{children}</>;
}
