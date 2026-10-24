"use client";

import styles from "../admin.module.css";
import { useAdminPanel } from "../AdminContext";
import { Icon, TarjetaResumen, ResumenDonut, fecha, tituloAlerta, type Periodo } from "../components/AdminWidgets";

export default function Alertas() {
  const {periodo, revisadas, setRevisadas, soloPendientes, setSoloPendientes, filtroAlerta, setFiltroAlerta, alertas, pendientes, ambientales, invalidas, alertasVisibles, hayDatos, mensajeVacio, conteoPorDia, alturaMax, cambiarPeriodo} = useAdminPanel();
  return <>
<div className={styles.statRow}>
            <TarjetaResumen icono="warning" titulo="Alertas ambientales" valor={hayDatos?String(ambientales):"—"} detalle="Generadas por condiciones fuera de rango" tono="ambar"/>
            <TarjetaResumen icono="info" titulo="Lecturas inválidas" valor={hayDatos?String(invalidas):"—"} detalle="Marcadas inválidas por procesamiento" tono="rojo"/>
            <TarjetaResumen icono="check" titulo="Revisadas en esta sesión" valor={hayDatos?String(alertas.length-pendientes):"—"} detalle="Solo cambia la vista local" tono="verde"/>
            <TarjetaResumen icono="clock" titulo="Última alerta" valor={alertas.length?fecha(alertas[0].timestamp):"—"} detalle={alertas.length?tituloAlerta(alertas[0]):"Sin alerta reportada"} tono="neutro"/>
          </div>
          <div className={`${styles.panel} ${styles.filterPanel}`}><label>Tipo de evento<select className={styles.select} value={filtroAlerta} onChange={e=>setFiltroAlerta(e.target.value)}><option>Todas</option><option>Ambientales</option><option>Inválidas</option></select></label><label>Período<select className={styles.select} value={periodo} onChange={e=>cambiarPeriodo(e.target.value as Periodo)}><option value="1h">Última hora</option><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 días</option></select></label><label>Revisión<select className={styles.select} value={soloPendientes?"pendientes":"todas"} onChange={e=>setSoloPendientes(e.target.value==="pendientes")}><option value="todas">Todas</option><option value="pendientes">Sin revisar</option></select></label><button type="button" className={styles.secondaryButton} onClick={()=>{setFiltroAlerta("Todas");setSoloPendientes(false);}}>Limpiar filtros</button></div>
          <div className={styles.alertsLayout}>
            <section className={styles.panel}><div className={styles.panelHeader}><div className={styles.panelTitle}><Icon name="bell"/><h3>Historial de alertas</h3></div><span className={styles.countPill}>{hayDatos?`${alertasVisibles.length} eventos`:"Sin datos"}</span></div>
              {alertasVisibles.length ? <div className={styles.fullAlertList}>{alertasVisibles.map(a=>{
                const marcada = revisadas.includes(a.id);
                return <article key={a.id} className={styles.fullAlert}><span className={`${styles.alertGlyph} ${a.estado==="invalida"?styles.alertWarning:styles.alertOk}`}><Icon name="warning" size={20}/></span><div className={styles.alertDescription}><h4>{tituloAlerta(a)}</h4><p>{a.motivos.join(" · ") || "Evento informado por la API"}</p><small><Icon name="clock" size={13}/>{fecha(a.timestamp,true)}</small></div><span className={a.estado==="invalida"?styles.pending:styles.recognized}>{a.estado==="invalida"?"Inválida":"Ambiental"}</span><button type="button" className={styles.secondaryButton} onClick={()=>setRevisadas(ids=>marcada?ids.filter(id=>id!==a.id):[...ids,a.id])}>{marcada?"Marcar no vista":"Marcar vista"}</button></article>;
              })}</div> : <div className={styles.chartEmpty}><Icon name="bell" size={29}/>{hayDatos?"Sin alertas para estos filtros.":mensajeVacio}</div>}
            </section>
            <aside className={styles.stackedPanels}>
              <section className={styles.panel}><div className={styles.panelTitle}><Icon name="chart"/><h3>Resumen de alertas</h3></div><ResumenDonut ambientales={ambientales} invalidas={invalidas}/></section>
              <section className={styles.panel}><div className={styles.panelTitle}><Icon name="activity"/><h3>Tendencia de alertas</h3></div><div className={styles.barChart}>{conteoPorDia.length?conteoPorDia.map(([dia,n])=><div key={dia} className={styles.barGroup}><span title={`${n} eventos`}>{n}</span><div style={{height:`${Math.max(5,n/alturaMax*100)}%`}}/><small>{dia.slice(5)}</small></div>):<p className={styles.emptyState}>No hay eventos para graficar.</p>}</div></section>
              <section className={styles.panel}><div className={styles.panelTitle}><Icon name="info"/><h3>Tipos de alertas</h3></div><div className={styles.detailRows}><div><span>Ambientales</span><strong>{hayDatos?ambientales:"—"}</strong></div><div><span>Inválidas</span><strong>{hayDatos?invalidas:"—"}</strong></div><div><span>Sin revisar (local)</span><strong>{hayDatos?pendientes:"—"}</strong></div></div></section>
            </aside>
          </div>
          <p className={styles.safetyNote}><Icon name="info" size={16}/>Las categorías se derivan de los datos recibidos. La API no informa criticidad ni resolución; «Marcar vista» no guarda cambios en Firebase.</p>
  </>;
}
