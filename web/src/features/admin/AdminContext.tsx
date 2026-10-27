"use client";

import { fetchConSesion } from "@/lib/sesionCliente";
import { formatoVpd } from "@/lib/vpd";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { esRespuestaAPI, numero, fechaISOChile, estadoConexion, estadoLectura, tituloAlerta, descargarCSV, type Periodo, type RespuestaAPI, type RegistroEvento } from "./components/AdminWidgets";

function useAdminModel() {
  const [periodo, setPeriodo] = useState<Periodo>("24h");
  const [respuesta, setRespuesta] = useState<RespuestaAPI | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [horaConsulta, setHoraConsulta] = useState(0);
  const [revisadas, setRevisadas] = useState<string[]>([]);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [filtroAlerta, setFiltroAlerta] = useState("Todas");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [ordenHistorial, setOrdenHistorial] = useState<"reciente" | "antiguo">("reciente");

  const consultar = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetchConSesion(`/api/sensores?range=${periodo}`, {cache: "no-store", signal});
      if (!res.ok) {
        if (res.status === 405) throw new Error("La API aún no implementa GET /api/sensores.");
        if (res.status === 401 || res.status === 403) throw new Error("La API necesita una sesión autorizada.");
        throw new Error(`No se pudieron obtener las lecturas (HTTP ${res.status}).`);
      }
      const contenido: unknown = await res.json();
      if (!esRespuestaAPI(contenido)) throw new Error("La API no devuelve el formato de lecturas y alertas esperado.");
      if (!signal?.aborted) {
        setRespuesta(contenido);
        setError("");
        setHoraConsulta(Date.now());
      }
    } catch (e) {
      if (signal?.aborted) return;
      setRespuesta(null);
      setHoraConsulta(0);
      setError(e instanceof Error ? e.message : "No se pudo consultar la API.");
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, [periodo]);

  useEffect(() => {
    const controller = new AbortController();
    const actualizar = () => { void consultar(controller.signal); };
    actualizar();
    // Solo la vista de 1 hora se refresca sola (cada 5 min); 24 h y 7 dias se consultan al cambiar de rango o recargar.
    const intervalo = periodo === "1h" ? window.setInterval(actualizar, 300_000) : null;
    return () => {controller.abort();if (intervalo !== null) window.clearInterval(intervalo);};
  }, [consultar, periodo]);

  const lecturas = useMemo(() => [...(respuesta?.summaries ?? [])].sort((a,b) => Date.parse(b.timestamp)-Date.parse(a.timestamp)), [respuesta]);
  const alertas = useMemo(() => [...(respuesta?.alerts ?? [])].sort((a,b) => Date.parse(b.timestamp)-Date.parse(a.timestamp)), [respuesta]);
  const ultima = lecturas[0];
  const conexion = estadoConexion(ultima, horaConsulta, error);
  const dispositivoTexto = conexion === "reciente" ? "Datos recientes" : conexion === "atrasado" ? "Lecturas atrasadas" : "Sin confirmar";
  const estadoBuzzer = ultima?.buzzer_activo === true ? "Activo" : ultima?.buzzer_activo === false ? "Inactivo" : "No reportado";
  const pendientes = alertas.filter(a => !revisadas.includes(a.id)).length;
  const ambientales = alertas.filter(a => a.estado === "alerta").length;
  const invalidas = alertas.filter(a => a.estado === "invalida").length;
  const alertasVisibles = alertas.filter(a => (!soloPendientes || !revisadas.includes(a.id)) && (filtroAlerta === "Todas" || (filtroAlerta === "Ambientales" ? a.estado === "alerta" : a.estado === "invalida")));
  const hayDatos = respuesta !== null;
  const mensajeVacio = cargando && !hayDatos ? "Consultando mediciones..." : error || "No hay datos en el período seleccionado.";

  const eventos = useMemo<RegistroEvento[]>(() => [
    ...lecturas.map(l => ({id:`lectura-${l.id}`,timestamp:l.timestamp,tipo:"Medición" as const,origen:"DHT22",descripcion:`Temperatura ${numero(l.temperatura_c,"°C")} · Humedad ${numero(l.humedad_pct,"%")} · VPD ${formatoVpd(l.vpd_kpa)}`,estado:estadoLectura(l)})),
    ...alertas.map(a => ({id:`alerta-${a.id}`,timestamp:a.timestamp,tipo:(a.estado === "invalida" ? "Inválida" : "Alerta") as "Alerta" | "Inválida",origen:"Procesamiento",descripcion:a.motivos.join(" · ") || tituloAlerta(a),estado:a.estado === "invalida" ? "Inválida" : "Alerta"})),
  ].sort((a,b) => Date.parse(b.timestamp)-Date.parse(a.timestamp)), [lecturas,alertas]);
  const eventosFiltrados = eventos.filter(e => {
    const dia = fechaISOChile(e.timestamp);
    const texto = `${e.origen} ${e.descripcion} ${e.estado}`.toLocaleLowerCase("es-CL");
    return (filtroTipo === "Todos" || e.tipo === filtroTipo)
      && (filtroEstado === "Todos" || e.estado === filtroEstado)
      && (!fechaDesde || dia >= fechaDesde)
      && (!fechaHasta || dia <= fechaHasta)
      && texto.includes(busquedaHistorial.toLocaleLowerCase("es-CL"));
  }).sort((a,b) => (ordenHistorial === "reciente" ? -1 : 1) * (Date.parse(a.timestamp)-Date.parse(b.timestamp)));
  const totalPaginas = Math.max(1,Math.ceil(eventosFiltrados.length/10));
  const paginaActual = Math.min(paginaHistorial,totalPaginas);
  const eventosPagina = eventosFiltrados.slice((paginaActual-1)*10,paginaActual*10);
  const paginaNueva = () => setPaginaHistorial(1);

  const conteoPorDia = useMemo(() => {
    const mapa = new Map<string,number>();
    alertas.forEach(a => {const dia=fechaISOChile(a.timestamp);mapa.set(dia,(mapa.get(dia)??0)+1);});
    return [...mapa.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-7);
  },[alertas]);
  const alturaMax = Math.max(1,...conteoPorDia.map(([,n])=>n));
  const cambiarPeriodo = (valor: Periodo) => {setPeriodo(valor);setRespuesta(null);setError("");setCargando(true);paginaNueva();};
  const exportarHistorial = () => descargarCSV([
    ["Fecha y hora","Tipo","Origen","Descripción","Estado"],
    ...eventosFiltrados.map(e => [new Date(e.timestamp).toLocaleString("es-CL",{timeZone:"America/Santiago"}),e.tipo,e.origen,e.descripcion,e.estado]),
  ],"historial-invernadero.csv");
  const exportarLecturas = () => descargarCSV([
    ["Fecha y hora","Temperatura (°C)","Humedad (%)","VPD (kPa)","Condición"],
    ...lecturas.map(l => [new Date(l.timestamp).toLocaleString("es-CL",{timeZone:"America/Santiago"}),l.temperatura_c?.toString()??"",l.humedad_pct?.toString()??"",l.vpd_kpa?.toString()??"",estadoLectura(l)]),
  ],"mediciones-dht22.csv");


  return { periodo, setPeriodo, respuesta, cargando, setCargando, error, horaConsulta, revisadas, setRevisadas, soloPendientes, setSoloPendientes, filtroAlerta, setFiltroAlerta, filtroEstado, setFiltroEstado, filtroTipo, setFiltroTipo, busquedaHistorial, setBusquedaHistorial, fechaDesde, setFechaDesde, fechaHasta, setFechaHasta, paginaHistorial, setPaginaHistorial, ordenHistorial, setOrdenHistorial, consultar, lecturas, alertas, ultima, conexion, dispositivoTexto, estadoBuzzer, pendientes, ambientales, invalidas, alertasVisibles, hayDatos, mensajeVacio, eventos, eventosFiltrados, totalPaginas, paginaActual, eventosPagina, paginaNueva, conteoPorDia, alturaMax, cambiarPeriodo, exportarHistorial, exportarLecturas };
}

const AdminContext = createContext<ReturnType<typeof useAdminModel> | null>(null);

export function AdminProvider({children}: {children: ReactNode}) {
  const model = useAdminModel();
  return <AdminContext.Provider value={model}>{children}</AdminContext.Provider>;
}

export function useAdminPanel() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("Vista de administración fuera de AdminProvider");
  return value;
}
