"use client";

import styles from "../admin.module.css";
import { useAdminPanel } from "../AdminContext";
import { Icon, TarjetaResumen, type IconName } from "../components/AdminWidgets";

export default function Buzzer() {
  const {estadoBuzzer} = useAdminPanel();
  return <>
<div className={styles.statRow}>
            <TarjetaResumen icono="speaker" titulo="Estado actual" valor={estadoBuzzer} detalle="Telemetría del KY-006" tono="neutro"/>
            <TarjetaResumen icono="settings" titulo="Modo automático" valor="No reportado" detalle="Sin API de configuración" tono="verde"/>
            <TarjetaResumen icono="clock" titulo="Última activación" valor="—" detalle="Sin historial de activaciones" tono="neutro"/>
            <TarjetaResumen icono="sensor" titulo="Pin GPIO" valor="—" detalle="No informado por el dispositivo" tono="azul"/>
          </div>
          <div className={styles.buzzerLayout}>
            <section className={styles.panel}><div className={styles.panelTitle}><Icon name="sliders"/><h3>Panel de control</h3></div><p className={styles.panelSubtitle}>Controles visibles, deshabilitados hasta habilitar la API de control del buzzer.</p>
              <div className={styles.buzzerControlInner}><div className={styles.buzzerIndicator}><span className={styles.buzzerCircle}><Icon name="speaker" size={52}/></span><h3>{estadoBuzzer}</h3><p>Estado reportado por la última lectura</p></div><div className={styles.buzzerControlActions}><div className={styles.controlRow}><div><strong>Modo automático</strong><p>Activación por condiciones configuradas</p></div><button type="button" className={styles.switch} role="switch" aria-checked={false} aria-label="Modo automático pendiente" disabled><span/></button></div><div className={styles.buttonTrio}><button className={styles.primaryButton} type="button" disabled><Icon name="play" size={16}/>Probar buzzer</button><button className={styles.secondaryButton} type="button" disabled><Icon name="speaker" size={16}/>Silenciar</button><button className={styles.secondaryButton} type="button" disabled><Icon name="power" size={16}/>Activar</button></div></div></div>
              <div className={styles.warningBox}><Icon name="warning" size={18}/><span>Los controles no realizan acciones sobre el dispositivo. Se habilitarán cuando el backend autorice las órdenes.</span></div>
            </section>
            <section className={styles.panel}><div className={styles.panelTitle}><Icon name="settings"/><h3>Reglas de activación</h3></div><p className={styles.panelSubtitle}>Opciones visuales pendientes de configuración remota.</p><div className={styles.ruleList}>{[
              {icono:"thermo" as IconName,titulo:"Temperatura sobre umbral",descripcion:"Cuando la temperatura supera el límite máximo"},
              {icono:"drop" as IconName,titulo:"Humedad fuera de rango",descripcion:"Cuando la humedad sale del intervalo definido"},
              {icono:"wifi" as IconName,titulo:"Pérdida de conectividad",descripcion:"Si deja de recibirse telemetría"},
              {icono:"sensor" as IconName,titulo:"Fallo de sensor",descripcion:"Ante una lectura inválida o un sensor con error"},
            ].map(r=><div key={r.titulo}><span className={styles.ruleIcon}><Icon name={r.icono}/></span><div><strong>{r.titulo}</strong><small>{r.descripcion}</small></div><span className={styles.unknownPill}>Sin configurar</span><button className={styles.switch} role="switch" aria-checked={false} type="button" disabled aria-label={`Configurar ${r.titulo}`}><span/></button></div>)}</div></section>
          </div>
          <section className={`${styles.panel} ${styles.buzzerHistory}`}><div className={styles.panelHeader}><div className={styles.panelTitle}><Icon name="history"/><h3>Historial de activaciones</h3></div></div><p className={styles.emptyState}>No hay un registro de activaciones disponible en la API actual. Los eventos aparecerán cuando la API los entregue.</p></section>
  </>;
}
