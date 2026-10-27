"use client";

import { Icon } from "@/components/ui/Icon";
import { formatoVpd } from "@/lib/vpd";
import base from "../consulta.module.css";
import styles from "../vistas.module.css";
import useConsultaViews from "../useConsultaViews";
import { fecha, numero, condicion, periodos, type Periodo, type FiltroCondicion } from "../components/ConsultaWidgets";

export default function HistorialConsulta() {
  const { error, periodo, desde, setDesde, hasta, setHasta, condicionFiltro, setCondicionFiltro, orden, ascendente, pagina, setPagina, cargando, setRefrescar, historico, porPagina, visibles, paginas, descargarCSV, cambiarPeriodo, ordenarPor } = useConsultaViews();
  return <div className={styles.body}>
    {error && <div className={base.errorStrip} role="alert"><Icon name="warning" size={18}/> {error} <button type="button" onClick={() => setRefrescar(r => r+1)}>Reintentar</button></div>}

          <section className={styles.filtersBar} aria-label="Filtros del historial">
            <div className={styles.field}><label htmlFor="histPeriodo">Período</label><div className={styles.inputIcon}><Icon name="calendar" size={19}/><select id="histPeriodo" value={periodo} onChange={(e) => cambiarPeriodo(e.target.value as Periodo)}>{periodos.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div></div>
            <div className={`${styles.field} ${styles.dateField}`}><label>Rango de fechas {periodo === "personalizado" ? "(hasta 7 días disponibles por API)" : ""}</label><div className={styles.dateControls}><input type="date" aria-label="Fecha de inicio" value={desde} disabled={periodo !== "personalizado"} onChange={(e) => { setDesde(e.target.value); setPagina(1); }}/><span>—</span><input type="date" aria-label="Fecha final" value={hasta} min={desde || undefined} disabled={periodo !== "personalizado"} onChange={(e) => { setHasta(e.target.value); setPagina(1); }}/></div></div>
            <div className={styles.field}><label htmlFor="histCondicion">Condición</label><select id="histCondicion" value={condicionFiltro} onChange={(e) => { setCondicionFiltro(e.target.value as FiltroCondicion); setPagina(1); }}><option value="todos">Todas</option><option value="normal">Normal</option><option value="alerta">Fuera de rango</option><option value="invalida">Lectura inválida</option></select></div>
            <button className={styles.exportButton} type="button" onClick={descargarCSV} disabled={!historico.length}><Icon name="download" size={19}/> Exportar datos</button>
          </section>
          <section className={styles.tableCard} aria-label="Tabla de historial de datos">
            <div className={styles.tableScroller}><table className={styles.historyTable}><thead><tr>
              {([ ["timestamp", "Fecha y hora"], ["temperatura_c", "Temperatura (°C)"], ["humedad_pct", "Humedad (%)"], ["vpd_kpa", "VPD (kPa)"], ["buzzer", "Estado del buzzer"], ["estado", "Condición"] ] as const).map(([key, label]) => <th key={key} aria-sort={orden === key ? (ascendente ? "ascending" : "descending") : undefined}>{key === "buzzer" ? label : <button type="button" onClick={() => ordenarPor(key)} aria-label={`Ordenar por ${label}`}>{label} <Icon name="updown" size={13}/></button>}</th>)}
            </tr></thead><tbody>
              {visibles.map((r) => { const c = condicion(r); return <tr key={r.id}><td>{fecha(r.timestamp)}</td><td>{numero(r.temperatura_c)}</td><td>{numero(r.humedad_pct)}</td><td>{formatoVpd(r.vpd_kpa,false)}</td><td><span className={styles.buzzerCell}><i className={r.buzzer_activo == null ? styles.dotMuted : r.buzzer_activo ? styles.dotRed : styles.dotGreen}/>{r.buzzer_activo == null ? "No reportado" : r.buzzer_activo ? "Activo" : "Inactivo"}</span></td><td><span className={`${styles.conditionTag} ${c === "normal" ? styles.tagGreen : c === "alerta" ? styles.tagYellow : styles.tagRed}`}>{c === "normal" ? "Normal" : c === "alerta" ? "Fuera de rango" : "Inválida"}</span></td></tr>; })}
              {visibles.length === 0 && <tr><td className={styles.emptyRows} colSpan={6}>{cargando ? "Cargando mediciones..." : "No hay mediciones para el período y los filtros seleccionados."}</td></tr>}
            </tbody></table></div>
            <div className={styles.tableFooter}><span>Mostrando {historico.length ? (pagina - 1) * porPagina + 1 : 0}–{Math.min(pagina * porPagina, historico.length)} de {historico.length} registros</span><div className={styles.pagination} aria-label="Paginación"><button type="button" aria-label="Página anterior" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}>‹</button>{Array.from({ length: Math.min(5, paginas) }, (_, i) => { const inicio = Math.max(1, Math.min(pagina - 2, paginas - 4)); const n = inicio + i; return <button type="button" key={n} aria-current={pagina === n ? "page" : undefined} className={pagina === n ? styles.currentPage : ""} onClick={() => setPagina(n)}>{n}</button>; })}<button type="button" aria-label="Página siguiente" onClick={() => setPagina((p) => Math.min(paginas, p + 1))} disabled={pagina === paginas}>›</button></div></div>
          </section>

    <div className={styles.footer}><span>Datos del DHT22 · Usuario de consulta · Acceso de solo lectura</span><button type="button" onClick={() => setRefrescar((x) => x + 1)} disabled={cargando}><Icon name="refresh" size={14}/> Actualizar</button></div>
  </div>;
}
