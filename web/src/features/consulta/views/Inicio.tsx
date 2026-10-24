"use client";

import Link from "next/link";
import styles from "../consulta.module.css";
import SensorMetricCard from "@/components/ui/SensorMetricCard";
import { useConsultaPanel } from "../ConsultaContext";
import { Icon } from "@/components/ui/Icon";
import { numero as formatearNumero, type PeriodoAPI as Periodo, nombreAlerta as alertaNombre } from "../components/ConsultaWidgets";
import GraficoConjunto from "../components/ConsultaChart";

function formatearFecha(iso:string, completa=false) {
  return new Intl.DateTimeFormat("es-CL", completa ? {timeZone:"America/Santiago",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"} : {timeZone:"America/Santiago",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
}
const rangoTexto: Record<Periodo,string>={"1h":"Última hora","24h":"Últimas 24 horas","7d":"Últimos 7 días"};

export default function InicioConsulta() {
  const {periodo,setPeriodo,datos,cargando,error,actualizado,setRefrescar,ultimo,estadoBuzzer} = useConsultaPanel();
  const rangoGrafico: Periodo = periodo === "personalizado" ? "7d" : periodo;
  const buzzer=ultimo?.buzzer_activo;
  const detalleBuzzer=buzzer===true?"Alerta sonora activa":buzzer===false?"Sin alarma reportada":"Sin telemetría del KY-006";
  const alertas=datos.alerts.slice(0,4);
  return <>
        {error && <div className={styles.errorStrip} role="alert"><Icon name="warning" size={17}/> {error} <button type="button" onClick={() => setRefrescar((n) => n + 1)}>Reintentar consulta</button></div>}

        <section className={`row g-3 ${styles.metricsRow}`} aria-label="Indicadores del invernadero">
          <div className="col-12 col-md-4"><SensorMetricCard role="consulta" kind="temperatura" title="Temperatura actual" value={formatearNumero(ultimo?.temperatura_c,"°C")} detail={ultimo?(ultimo.estado==="alerta"?"Revisar alertas":"Última medición"):"Sin datos"}/></div>
          <div className="col-12 col-md-4"><SensorMetricCard role="consulta" kind="humedad" title="Humedad actual" value={formatearNumero(ultimo?.humedad_pct,"%")} detail={ultimo?(ultimo.estado==="alerta"?"Revisar alertas":"Última medición"):"Sin datos"}/></div>
          <div className="col-12 col-md-4"><SensorMetricCard role="consulta" kind="buzzer" title="Estado del buzzer" value={estadoBuzzer} detail={detalleBuzzer}/></div>
        </section>
        <div className={`row g-3 ${styles.mainGrid}`}>
          <div className="col-12 col-xl-8 d-flex flex-column gap-3">
            <section className={styles.panel} id="historial" aria-labelledby="historico-titulo">
              <div className={styles.panelHeader}>
                <div className={styles.panelHeaderTitle}><Icon name="clock" size={24}/><h2 id="historico-titulo">Historial de datos <span>({rangoTexto[rangoGrafico]})</span></h2></div>
                <div className={styles.graphControls}>
                  <div className={styles.legend}><span><i className={styles.legendDotGreen}/>Temperatura (°C)</span><span><i className={styles.legendDotBlue}/>Humedad (%)</span></div>
                  <select className={styles.rangeSelect} aria-label="Rango del historial" value={rangoGrafico} onChange={(e) => setPeriodo(e.target.value as Periodo)}><option value="1h">Última hora</option><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 días</option></select>
                  <button type="button" className={styles.refreshButton} title="Actualizar datos" aria-label="Actualizar datos" onClick={() => setRefrescar((n) => n + 1)} disabled={cargando}><Icon name="refresh" size={17}/></button>
                </div>
              </div>
              <GraficoConjunto summaries={datos.summaries} periodo={rangoGrafico}/>
              <div className={styles.chartFoot}><span>{actualizado ? `Consultado ${actualizado.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` : "Esperando primera consulta"}</span><span>Los ejes muestran °C y % por separado</span></div>
            </section>

            <section className={styles.panel} id="mediciones" aria-labelledby="mediciones-titulo">
              <div className={styles.panelHeader}><div className={styles.panelHeaderTitle}><Icon name="database" size={24}/><h2 id="mediciones-titulo">Últimas mediciones</h2></div><Link href="/consulta/historial" className={styles.textLink}>Ver historial <Icon name="chevron" size={15}/></Link></div>
              <div className="table-responsive"><table className={styles.measurementsTable}><thead><tr><th>Hora</th><th>Temperatura (°C)</th><th>Humedad (%)</th><th>Estado del buzzer</th></tr></thead><tbody>{datos.summaries.slice(0, 5).map((r) => <tr key={r.id}><td>{formatearFecha(r.timestamp)}</td><td>{formatearNumero(r.temperatura_c, "")}</td><td>{formatearNumero(r.humedad_pct, "")}</td><td><span className={`${styles.tableState} ${r.buzzer_activo === true ? styles.tableAlert : r.buzzer_activo === false ? styles.tableNormal : styles.tableInvalid}`}><span/> {r.buzzer_activo === true ? "Activo" : r.buzzer_activo === false ? "Inactivo" : "No reportado"}</span></td></tr>)}{!datos.summaries.length && <tr><td colSpan={4} className={styles.emptyTable}>No hay mediciones para este período.</td></tr>}</tbody></table></div>
            </section>
          </div>

          <div className="col-12 col-xl-4">
            <section className={`${styles.panel} ${styles.alertPanel}`} id="alertas" aria-labelledby="alertas-titulo">
              <div className={styles.panelHeader}><div className={styles.panelHeaderTitle}><Icon name="bell" size={24}/><h2 id="alertas-titulo">Alertas recientes</h2></div><Link className={styles.textLink} href="/consulta/alertas">Ver todas <Icon name="chevron" size={15}/></Link></div>
              <div className={styles.alertsStack}>{alertas.map((a) => <article key={a.id} className={styles.alertItem}><div className={`${styles.alertSymbol} ${a.estado === "invalida" ? styles.alertSymbolInvalid : styles.alertSymbolDanger}`}><Icon name={a.estado === "invalida" ? "warning" : a.motivos.join(" ").toLowerCase().includes("humedad") ? "drop" : "thermo"} size={24}/></div><div className={styles.alertCopy}><strong>{alertaNombre(a)}</strong><p>{a.motivos.join(" · ") || "Evento registrado"}</p><small>{formatearFecha(a.timestamp, true)}</small></div><span className={`${styles.alertTag} ${a.estado === "invalida" ? styles.invalidTag : styles.dangerTag}`}>{a.estado === "invalida" ? "Inválida" : "Alerta"}</span></article>)}{!alertas.length && <div className={styles.emptyAlerts}><Icon name="check" size={29}/><strong>{actualizado ? "Sin alertas registradas" : "Alertas no disponibles"}</strong><span>{actualizado ? "En el período seleccionado no se registraron alertas." : "Los eventos aparecerán cuando la API entregue datos."}</span></div>}</div>
              <div className={styles.alertFooter}>{actualizado ? `Alertas: ${datos.counts.alertas} · Lecturas inválidas: ${datos.counts.invalidas}` : "Sin datos de alertas"}</div>
            </section>
          </div>
        </div>
        <p className={styles.smallFooter}>Datos del DHT22 · Acceso de solo consulta · Origen: API /api/sensores</p>

  </>;
}
