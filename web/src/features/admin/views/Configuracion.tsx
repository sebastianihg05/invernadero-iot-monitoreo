"use client";

import styles from "../admin.module.css";
import { Icon } from "../components/AdminWidgets";

const campos = [
  {titulo:"Temperatura mínima",unidad:"°C",icon:"thermo" as const},
  {titulo:"Temperatura máxima",unidad:"°C",icon:"thermo" as const},
  {titulo:"Humedad mínima",unidad:"%",icon:"drop" as const},
  {titulo:"Humedad máxima",unidad:"%",icon:"drop" as const},
];

export default function Configuracion() {
  return <div className={styles.configColumns}>
    <div className={styles.configMain}>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><Icon name="sliders"/><div>
          <h3>Umbrales ambientales</h3>
          <p className={styles.panelSubtitle}>Valores reales que reportará la configuración del invernadero</p>
        </div></div>
        <div className={styles.ambientForm}>
          {campos.map(campo=><div className={styles.readonlyField} key={campo.titulo}>
            <span className={styles.readonlyFieldLabel}><Icon name={campo.icon} size={17}/>{campo.titulo} ({campo.unidad})</span>
            <strong>—</strong>
            <small>Valor pendiente de consulta al sistema</small>
          </div>)}
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><Icon name="clock"/><div>
          <h3>Frecuencia de medición</h3>
          <p className={styles.panelSubtitle}>Intervalo real definido en el dispositivo</p>
        </div></div>
        <div className={styles.configSummary}><div><strong>Intervalo de adquisición</strong><p>Valor actual <b>—</b></p></div></div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><Icon name="settings"/><div>
          <h3>Configuración del sistema</h3>
          <p className={styles.panelSubtitle}>Funciones que requerirán configuración remota</p>
        </div></div>
        <div className={styles.disabledSettings}>{["Alertas automáticas", "Enviar notificaciones", "Registro histórico extendido"].map(label=><div key={label}>
          <span>{label}</span><span className={styles.unknownPill}>Sin información</span>
        </div>)}</div>
      </section>
    </div>
    <aside className={styles.stackedPanels}>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><Icon name="info"/><h3>Estado de la configuración</h3></div>
        <p className={styles.panelSubtitle}>No hay una API de configuración conectada a este frontend.</p>
        <div className={styles.configSummary}>
          <div><strong>Parámetros reales</strong><p>Umbrales <b>No disponibles</b></p><p>Frecuencia <b>No disponible</b></p></div>
        </div>
      </section>
      <section className={styles.helperPanel}><Icon name="shield" size={21}/><div>
        <strong>Administración remota pendiente</strong>
        <p>Una vez que exista un endpoint autorizado, esta pantalla podrá leer y cambiar los umbrales y la frecuencia reales. Por ahora no se guarda nada en el navegador ni se envía ninguna orden a Firebase o Raspberry Pi.</p>
      </div></section>
    </aside>
  </div>;
}
