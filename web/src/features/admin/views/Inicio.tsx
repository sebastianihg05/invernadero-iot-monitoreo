"use client";

import styles from "../admin.module.css";
import Link from "next/link";
import SensorMetricCard from "@/components/ui/SensorMetricCard";
import { useAdminPanel } from "../AdminContext";
import { Icon, Grafico, TablaLecturas, numero, fecha, tituloAlerta, type Periodo } from "../components/AdminWidgets";

export default function Inicio() {
  const {periodo, horaConsulta, lecturas, alertas, ultima, conexion, dispositivoTexto, estadoBuzzer, ambientales, invalidas, hayDatos, mensajeVacio, cambiarPeriodo} = useAdminPanel();
  return <>
<div className={styles.sectionHeading}><div><h2>Resumen del invernadero</h2><p>Condiciones ambientales y estado de los componentes</p></div><span className={styles.dateTag}><Icon name="clock" size={15}/>{ultima ? `Última lectura: ${fecha(ultima.timestamp,true)}` : "Sin lecturas disponibles"}</span></div>
          <div className={styles.metricGrid}>
            <SensorMetricCard role="admin" kind="temperatura" title="Temperatura actual" value={numero(ultima?.temperatura_c,"°C")} detail={ultima?"Última lectura recibida":"Sin datos"}/>
            <SensorMetricCard role="admin" kind="humedad" title="Humedad actual" value={numero(ultima?.humedad_pct,"%")} detail={ultima?"Última lectura recibida":"Sin datos"}/>
            <SensorMetricCard role="admin" kind="buzzer" title="Estado del buzzer" value={estadoBuzzer} detail="KY-006 · telemetría"/>
            <SensorMetricCard role="admin" kind="dispositivo" title="Estado del dispositivo" value={dispositivoTexto} detail={ultima?`Lectura: ${fecha(ultima.timestamp,true)}`:"Sin telemetría de conexión"} connected={conexion==="reciente"}/>
          </div>
          <div className={styles.homeColumns}><div className={styles.homeMain}>
            <section className={styles.panel}><div className={styles.panelHeader}><div className={styles.panelTitle}><Icon name="chart"/><h3>Historial de datos</h3></div><div className={styles.chartOptions}><div className={styles.legend}><span><i className={styles.legendTemp}/>Temperatura (°C)</span><span><i className={styles.legendHum}/>Humedad (%)</span></div><select value={periodo} onChange={e=>cambiarPeriodo(e.target.value as Periodo)} className={styles.select} aria-label="Período"><option value="1h">Última hora</option><option value="24h">Últimas 24 h</option><option value="7d">Últimos 7 días</option></select></div></div>
              {lecturas.length ? <Grafico lecturas={lecturas}/> : <div className={styles.chartEmpty}><Icon name="chart" size={30}/>{mensajeVacio}</div>}
              <div className={styles.chartFooter}><span>{horaConsulta?`Consulta: ${fecha(new Date(horaConsulta).toISOString(),true)}`:"Esperando consulta"}</span><Link href="/admin/historial" className={styles.inlineLink}>Ver historial <Icon name="arrow" size={15}/></Link></div>
            </section>
            <div className={styles.overviewBottomGrid}>
              <section className={styles.panel}><div className={styles.panelHeader}><div className={styles.panelTitle}><Icon name="database"/><h3>Últimas mediciones</h3></div><Link href="/admin/historial" className={styles.inlineLink}>Ver historial <Icon name="arrow" size={15}/></Link></div><TablaLecturas lecturas={lecturas.slice(0,5)} vacio={mensajeVacio}/></section>
              <section className={styles.panel}><div className={styles.panelHeader}><div className={styles.panelTitle}><Icon name="settings"/><h3>Umbrales del dispositivo</h3></div><Link href="/admin/configuracion" className={styles.inlineLink}>Ir a configuración <Icon name="arrow" size={15}/></Link></div>
                <div className={styles.thresholdGrid}>
                  <div className={styles.thresholdGroup}><strong><Icon name="thermo" size={15}/>Temperatura (°C)</strong><div><span>Mínima<b>—</b></span><span>Máxima<b>—</b></span></div></div>
                  <div className={styles.thresholdGroup}><strong><Icon name="drop" size={15}/>Humedad (%)</strong><div><span>Mínima<b>—</b></span><span>Máxima<b>—</b></span></div></div>
                </div><div className={styles.thresholdNote}><Icon name="info" size={17}/>Los umbrales reales se mostrarán al conectar la configuración del dispositivo. Por ahora, no se ha conectado una API de configuración remota.</div>
              </section>
            </div></div>
            <section className={`${styles.panel} ${styles.alertPanel}`}><div className={styles.panelHeader}><div className={styles.panelTitle}><Icon name="bell"/><h3>Alertas recientes</h3></div><Link href="/admin/alertas" className={styles.inlineLink}>Ver todas <Icon name="arrow" size={15}/></Link></div>
              {alertas.length ? <div className={styles.alertList}>{alertas.slice(0,6).map(a=><div key={a.id} className={styles.alertRow}><span className={`${styles.alertGlyph} ${styles.alertWarning}`}><Icon name="warning" size={20}/></span><div><strong>{tituloAlerta(a)}</strong><p>{a.motivos.join(" · ") || "Evento registrado"}</p><small>{fecha(a.timestamp,true)}</small></div></div>)}</div> : <div className={styles.alertEmpty}><Icon name="check" size={28}/><strong>{hayDatos?"Sin alertas registradas":"Alertas no disponibles"}</strong><small>{hayDatos?"No hay eventos en el período consultado.":"Se mostrarán cuando la API proporcione datos."}</small></div>}
              <div className={styles.alertPanelFooter}>{hayDatos?`Alertas: ${ambientales} · Inválidas: ${invalidas}`:"Sin información de alertas"}</div>
            </section>
          </div>
  </>;
}
