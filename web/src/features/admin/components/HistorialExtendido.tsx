"use client";

import { fetchConSesion } from "@/lib/sesionCliente";
import { useMemo, useState } from "react";
import styles from "../admin.module.css";
import { Icon, TextoEstado, descargarCSV, estadoLectura, fecha, numero, type Alerta, type Resumen } from "./AdminWidgets";

// Historial extendido (solo admin): consulta /api/admin/historial bajo demanda y tras confirmar,
// porque lee 1 documento de Firestore por minuto del período (30 días ≈ 43.200 lecturas).
type Fila = [number, number | null, number | null, number | null, number, number, string];
type Respuesta = { days: number; filas: Fila[]; alerts: Alerta[]; counts: { alertas: number; invalidas: number } };

const POR_PAGINA = 50;
const OPCIONES = [8, 14, 30];

const esRespuesta = (v: unknown): v is Respuesta =>
  !!v && typeof v === "object" && Array.isArray((v as Respuesta).filas) && Array.isArray((v as Respuesta).alerts);

export default function HistorialExtendido() {
  const [dias, setDias] = useState(30);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [pagina, setPagina] = useState(1);

  const lecturas = useMemo<Resumen[]>(() => (respuesta?.filas ?? []).map(([s, t, h, v, a, i, e]) => ({
    id: String(s), timestamp: new Date(s * 1000).toISOString(), estado: e, alertas: a, invalidas: i, temperatura_c: t, humedad_pct: h, vpd_kpa: v,
  })), [respuesta]);
  const totalPaginas = Math.max(1, Math.ceil(lecturas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = lecturas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  async function consultar() {
    const estimadas = (dias * 1440).toLocaleString("es-CL");
    if (!window.confirm(
      `Vas a consultar el historial completo de los últimos ${dias} días.\n\n` +
      `Esto lee hasta ~${estimadas} documentos de Firestore (la cuota gratuita es de 50.000 al día) ` +
      `y puede dejar el panel sin lecturas por el resto del día.\n\n¿Deseas continuar?`,
    )) return;

    setCargando(true);
    setError("");
    setRespuesta(null);
    setPagina(1);
    try {
      const res = await fetchConSesion(`/api/admin/historial?days=${dias}`, { cache: "no-store" });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const mensaje = json && typeof json === "object" && typeof (json as { error?: unknown }).error === "string" ? (json as { error: string }).error : "";
        throw new Error(mensaje || `La consulta falló (HTTP ${res.status}).`);
      }
      if (!esRespuesta(json)) throw new Error("La API devolvió un formato inesperado.");
      setRespuesta(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar el historial extendido.");
    } finally {
      setCargando(false);
    }
  }

  const exportar = () => descargarCSV([
    ["Fecha y hora", "Temperatura (°C)", "Humedad (%)", "VPD (kPa)", "Alertas", "Inválidas", "Condición"],
    ...lecturas.map(l => [new Date(l.timestamp).toLocaleString("es-CL", { timeZone: "America/Santiago" }), l.temperatura_c?.toString() ?? "", l.humedad_pct?.toString() ?? "", l.vpd_kpa?.toString() ?? "", String(l.alertas), String(l.invalidas), estadoLectura(l)]),
  ], `historial-extendido-${respuesta?.days ?? dias}d.csv`);

  return (
    <section className={styles.panel} aria-labelledby="historial-extendido-titulo">
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}><Icon name="database"/><h3 id="historial-extendido-titulo">Historial extendido</h3></div>
        <span className={styles.dateTag}>Solo administración</span>
      </div>
      <p className={styles.panelSubtitle}>Todas las mediciones de un período mayor a 7 días. Se consulta solo cuando la pides y confirmas.</p>
      <div className={styles.actionBar}>
        <label className={styles.fieldSelect}>Período
          <select className={styles.select} value={dias} onChange={e => setDias(Number(e.target.value))} disabled={cargando}>
            {OPCIONES.map(d => <option key={d} value={d}>Últimos {d} días</option>)}
          </select>
        </label>
        <button type="button" className={styles.primaryButton} onClick={consultar} disabled={cargando}>{cargando ? "Consultando..." : "Consultar historial extendido"}</button>
        <button type="button" className={styles.secondaryButton} onClick={exportar} disabled={!lecturas.length || cargando}>Exportar CSV</button>
      </div>
      <div className={styles.warningBox}><Icon name="warning" size={20}/><span>Consume muchas lecturas de Firestore. El servidor la rechaza si supera las lecturas disponibles del día.</span></div>
      {error && <p className={styles.formError} role="alert">{error}</p>}
      {respuesta && <>
        <div className={styles.chartFooter}>
          <span>{lecturas.length.toLocaleString("es-CL")} mediciones · {respuesta.counts.alertas} alertas · {respuesta.counts.invalidas} inválidas</span>
          <span>Período: {respuesta.days} días</span>
        </div>
        <div className={styles.tableScroll}><table className={styles.dataTable}>
          <thead><tr><th>Fecha y hora</th><th>Temperatura</th><th>Humedad</th><th>VPD</th><th>Condición</th></tr></thead>
          <tbody>
            {visibles.map(l => <tr key={l.id}><td>{fecha(l.timestamp, true)}</td><td>{numero(l.temperatura_c, "°C")}</td><td>{numero(l.humedad_pct, "%")}</td><td>{numero(l.vpd_kpa, "kPa")}</td><td><TextoEstado estado={estadoLectura(l)}/></td></tr>)}
            {!visibles.length && <tr><td colSpan={5} className={styles.emptyTable}>No hay mediciones en este período.</td></tr>}
          </tbody>
        </table></div>
        <div className={styles.pagination}>
          <span>Mostrando {lecturas.length ? (paginaActual - 1) * POR_PAGINA + 1 : 0}–{Math.min(paginaActual * POR_PAGINA, lecturas.length)} de {lecturas.length}</span>
          <div>
            <button type="button" disabled={paginaActual === 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>Anterior</button>
            <strong>{paginaActual} / {totalPaginas}</strong>
            <button type="button" disabled={paginaActual >= totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>Siguiente</button>
          </div>
        </div>
      </>}
    </section>
  );
}
