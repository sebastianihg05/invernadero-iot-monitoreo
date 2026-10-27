"use client";

import { useCallback, useMemo, useState } from "react";
import { useConsultaPanel } from "./ConsultaContext";
import { type Periodo, type Alerta, type Orden, type Origen, type FiltroTipo, type FiltroCondicion, condicion, tipoAlerta, soloDia, fecha } from "./components/ConsultaWidgets";

export default function useConsultaViews() {
  const {periodo,setPeriodo,datos,cargando,error,actualizado,setRefrescar} = useConsultaPanel();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [condicionFiltro, setCondicionFiltro] = useState<FiltroCondicion>("todos");
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>("todos");
  const [origen, setOrigen] = useState<Origen>("todos");
  const [orden, setOrden] = useState<Orden>("timestamp");
  const [ascendente, setAscendente] = useState(false);
  const [pagina, setPagina] = useState(1);


  const rangoFecha = useCallback((timestamp: string) => {
    if (periodo !== "personalizado") return true;
    const f = soloDia(timestamp);
    return (!desde || f >= desde) && (!hasta || f <= hasta);
  }, [periodo, desde, hasta]);

  const historico = useMemo(() => {
    const rows = datos.summaries.filter((r) => rangoFecha(r.timestamp) && (condicionFiltro === "todos" || condicion(r) === condicionFiltro));
    return rows.sort((a, b) => {
      let cmp = 0;
      if (orden === "timestamp") cmp = Date.parse(a.timestamp) - Date.parse(b.timestamp);
      else if (orden === "estado") cmp = condicion(a).localeCompare(condicion(b));
      else { const va = a[orden], vb = b[orden]; cmp = va == null ? (vb == null ? 0 : 1) : vb == null ? -1 : va - vb; }
      return ascendente ? cmp : -cmp;
    });
  }, [datos.summaries, rangoFecha, condicionFiltro, orden, ascendente]);

  const alertasFiltradas = useMemo(() => datos.alerts.filter((a) => rangoFecha(a.timestamp)
    && (tipoFiltro === "todos" || a.estado === tipoFiltro)
    && (origen === "todos" || tipoAlerta(a) === origen)), [datos.alerts, rangoFecha, tipoFiltro, origen]);

  const porPagina = 10;
  const visibles = historico.slice((pagina - 1) * porPagina, pagina * porPagina);
  const paginas = Math.max(1, Math.ceil(historico.length / porPagina));
  const alertasPorDia = useMemo(() => {
    const grupos: { key: string; label: string; items: Alerta[] }[] = [];
    alertasFiltradas.forEach((a) => {
      const key = soloDia(a.timestamp);
      let grupo = grupos.find((g) => g.key === key);
      if (!grupo) {
        grupo = { key, label: new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(a.timestamp)), items: [] };
        grupos.push(grupo);
      }
      grupo.items.push(a);
    });
    return grupos;
  }, [alertasFiltradas]);

  const contarAlertas = alertasFiltradas.filter((a) => a.estado === "alerta").length;
  const contarInvalidas = alertasFiltradas.filter((a) => a.estado === "invalida").length;
  const ultimaAlerta = alertasFiltradas[0];
  const totalEventos = contarAlertas + contarInvalidas;
  const dataReciente = datos.summaries[0];
  const edad = dataReciente && actualizado ? actualizado.getTime() - Date.parse(dataReciente.timestamp) : Number.POSITIVE_INFINITY;
  const estadoSistema = error ? "Datos no disponibles" : cargando ? "Consultando" : dataReciente && edad >= -60_000 && edad <= 300_000 ? "Lecturas recientes" : dataReciente ? "Sin lecturas recientes" : "Sin mediciones";

  function descargarCSV() {
    if (!historico.length) return;
    const cabeceras = ["Fecha y hora", "Temperatura (°C)", "Humedad (%)", "VPD (kPa)", "Buzzer", "Condición"];
    const filas = historico.map((r) => [fecha(r.timestamp), r.temperatura_c == null ? "" : String(r.temperatura_c), r.humedad_pct == null ? "" : String(r.humedad_pct), r.vpd_kpa == null ? "" : String(r.vpd_kpa), r.buzzer_activo == null ? "No reportado" : r.buzzer_activo ? "Activo" : "Inactivo", condicion(r)]);
    const escapar = (v: string) => `"${(/^[\s]*[=+@-]/.test(v) ? "'" : "") + v.replace(/"/g, '""')}\"`;
    const csv = "\uFEFF" + [cabeceras, ...filas].map((r) => r.map(escapar).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial-invernadero-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function cambiarPeriodo(next: Periodo) { setPeriodo(next); setPagina(1); }
  function ordenarPor(campo: Orden) {
    if (orden === campo) setAscendente((x) => !x);
    else { setOrden(campo); setAscendente(campo !== "timestamp"); }
    setPagina(1);
  }


  return {periodo, setPeriodo, desde, setDesde, hasta, setHasta, condicionFiltro, setCondicionFiltro, tipoFiltro, setTipoFiltro, origen, setOrigen, orden, setOrden, ascendente, setAscendente, pagina, setPagina, datos, cargando, error, setRefrescar, actualizado, rangoFecha, historico, alertasFiltradas, porPagina, visibles, paginas, alertasPorDia, contarAlertas, contarInvalidas, ultimaAlerta, totalEventos, dataReciente, edad, estadoSistema, descargarCSV, cambiarPeriodo, ordenarPor};
}
