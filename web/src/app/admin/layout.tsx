import { Suspense, type ReactNode } from "react";
import { AdminProvider } from "@/features/admin/AdminContext";
import AdminFrame from "@/features/admin/AdminFrame";

export default function LayoutAdministrador({children}: {children: ReactNode}) {
  return <Suspense fallback={<main style={{padding:28,background:"#07171d",color:"#d9f1e8",minHeight:"100vh"}}>Cargando panel de administración…</main>}>
    <AdminProvider><AdminFrame>{children}</AdminFrame></AdminProvider>
  </Suspense>;
}
