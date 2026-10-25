import { Suspense, type ReactNode } from "react";
import { ConsultaProvider } from "@/features/consulta/ConsultaContext";
import ConsultaFrame from "@/features/consulta/ConsultaFrame";
import GuardiaSesion from "@/components/layout/GuardiaSesion";

export default function LayoutConsulta({children}:{children:ReactNode}) {
  return <GuardiaSesion><Suspense fallback={<main style={{padding:28,background:"#07171d",color:"#d9f1e8",minHeight:"100vh"}}>Cargando panel de consulta…</main>}>
    <ConsultaProvider><ConsultaFrame>{children}</ConsultaFrame></ConsultaProvider>
  </Suspense></GuardiaSesion>;
}
