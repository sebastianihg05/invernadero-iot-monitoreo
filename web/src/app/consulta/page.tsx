import { Suspense } from "react";
import ConsultaCliente from "./ConsultaCliente";

type ConsultaPageProps = {
  searchParams: Promise<{ demo?: string | string[] }>;
};

// La lectura de searchParams debe ocurrir dentro de Suspense
// para permitir el prerenderizado parcial de Next.js 16.
async function ContenidoConsulta({ searchParams }: ConsultaPageProps) {
  const parametros = await searchParams;
  const demoInicial = Array.isArray(parametros.demo)
    ? parametros.demo.includes("1")
    : parametros.demo === "1";

  return <ConsultaCliente demoInicial={demoInicial} />;
}

export default function ConsultaPage({ searchParams }: ConsultaPageProps) {
  return (
    <Suspense
      fallback={
        <main className="container-fluid py-5 text-center" role="status">
          Cargando panel de consulta...
        </main>
      }
    >
      <ContenidoConsulta searchParams={searchParams} />
    </Suspense>
  );
}
