"use client";

import { fetchConSesion } from "@/lib/sesionCliente";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { VACIO, parsearRespuesta, type Datos, type Periodo, type PeriodoAPI } from "./components/ConsultaWidgets";

function useConsultaModel() {
  const [periodo, setPeriodo] = useState<Periodo>("1h");
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [refrescar, setRefrescar] = useState(0);
  const periodoAPI: PeriodoAPI = periodo === "personalizado" ? "7d" : periodo;

  const cargar = useCallback(async (signal: AbortSignal) => {
    if (signal.aborted) return;
    setCargando(true);
    try {
      const respuesta = await fetchConSesion(`/api/sensores?range=${periodoAPI}`, {signal, cache: "no-store"});
      if (!respuesta.ok) throw new Error(respuesta.status === 405
        ? "La API todavía no admite consultar mediciones (GET)."
        : `No se pudieron obtener los datos (HTTP ${respuesta.status}).`);
      const json: unknown = await respuesta.json();
      const parsed = parsearRespuesta(json);
      if (signal.aborted) return;
      setDatos(parsed);
      setError(null);
      setActualizado(new Date());
    } catch (err) {
      if (signal.aborted) return;
      setDatos(VACIO);
      setActualizado(null);
      setError(err instanceof Error ? err.message : "No fue posible recuperar los datos.");
    } finally {
      if (!signal.aborted) setCargando(false);
    }
  }, [periodoAPI]);

  useEffect(() => {
    const controller = new AbortController();
    const inicio = window.setTimeout(() => void cargar(controller.signal), 0);
    // Solo la vista de 1 hora se refresca sola (cada 5 min); 24 h y 7 dias se consultan al cambiar de rango o con el boton.
    const timer = periodoAPI === "1h" ? window.setInterval(() => void cargar(controller.signal), 300_000) : null;
    return () => {window.clearTimeout(inicio);if(timer !== null) window.clearInterval(timer);controller.abort();};
  }, [cargar, refrescar, periodoAPI]);

  const ultimo = datos.summaries[0];
  const edad = ultimo && actualizado ? actualizado.getTime() - Date.parse(ultimo.timestamp) : Number.POSITIVE_INFINITY;
  const recientes = edad >= -60_000 && edad <= 300_000;
  const estadoDato = error ? "Datos no disponibles" : cargando ? "Consultando" : !ultimo ? "Sin mediciones" : recientes ? "Datos recientes" : "Datos antiguos";
  const buzzer = ultimo?.buzzer_activo;
  const estadoBuzzer = buzzer === true ? "Activo" : buzzer === false ? "Inactivo" : "No reportado";
  return { periodo, setPeriodo, datos, cargando, error, actualizado, refrescar, setRefrescar, ultimo, recientes, estadoDato, estadoBuzzer };
}

const ConsultaContext = createContext<ReturnType<typeof useConsultaModel> | null>(null);
export function ConsultaProvider({children}:{children:ReactNode}) {
  const model=useConsultaModel();
  return <ConsultaContext.Provider value={model}>{children}</ConsultaContext.Provider>;
}
export function useConsultaPanel(){
  const model=useContext(ConsultaContext);
  if(!model) throw new Error("Vista de consulta fuera de ConsultaProvider");
  return model;
}
