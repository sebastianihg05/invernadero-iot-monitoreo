"use client";

import { useEffect, useState } from "react";
import styles from "../admin.module.css";
import { Icon } from "../components/AdminWidgets";
import { fetchConSesion } from "@/lib/sesionCliente";

type Clave = "temp_min" | "temp_max" | "hum_min" | "hum_max";

const campos = [
  {clave:"temp_min" as Clave,titulo:"Temperatura mínima",unidad:"°C",icon:"thermo" as const},
  {clave:"temp_max" as Clave,titulo:"Temperatura máxima",unidad:"°C",icon:"thermo" as const},
  {clave:"hum_min" as Clave,titulo:"Humedad mínima",unidad:"%",icon:"drop" as const},
  {clave:"hum_max" as Clave,titulo:"Humedad máxima",unidad:"%",icon:"drop" as const},
];

export default function Configuracion() {
  const [valores, setValores] = useState<Record<Clave, string> | null>(null);
  const [actualizado, setActualizado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    try {
      const res = await fetchConSesion("/api/configuracion", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.error || "No se pudo leer la configuración.");
      setValores({ temp_min: String(json.temp_min), temp_max: String(json.temp_max), hum_min: String(json.hum_min), hum_max: String(json.hum_max) });
      setActualizado(json.actualizado);
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof Error ? e.message : "No se pudo leer la configuración." });
    }
  }

  useEffect(() => { cargar(); }, []);

  async function guardar() {
    if (!valores) return;
    const numeros = { temp_min: Number(valores.temp_min), temp_max: Number(valores.temp_max), hum_min: Number(valores.hum_min), hum_max: Number(valores.hum_max) };
    if (Object.values(numeros).some((n) => !Number.isFinite(n)) || Object.values(valores).some((v) => v.trim() === "")) {
      setAviso({ ok: false, texto: "Completa los cuatro umbrales con números." });
      return;
    }
    if (numeros.temp_min >= numeros.temp_max || numeros.hum_min >= numeros.hum_max) {
      setAviso({ ok: false, texto: "El mínimo debe ser menor que el máximo." });
      return;
    }

    setGuardando(true);
    setAviso(null);
    try {
      const res = await fetchConSesion("/api/configuracion", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(numeros) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "No se pudo guardar la configuración.");
      setAviso({ ok: true, texto: "Umbrales guardados. La Raspberry los aplica en menos de un minuto." });
      await cargar();
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof Error ? e.message : "No se pudo guardar la configuración." });
    } finally {
      setGuardando(false);
    }
  }

  return <div className={styles.configColumns}>
    <div className={styles.configMain}>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><Icon name="sliders"/><div>
          <h3>Umbrales ambientales</h3>
          <p className={styles.panelSubtitle}>Fuera de este rango la Raspberry marca la lectura como alerta</p>
        </div></div>
        <div className={styles.ambientForm}>
          {campos.map(campo=><label key={campo.clave}>
            <span className={styles.readonlyFieldLabel}><Icon name={campo.icon} size={17}/>{campo.titulo} ({campo.unidad})</span>
            <input type="number" step="0.1" disabled={!valores || guardando} value={valores ? valores[campo.clave] : ""} onChange={(e)=>setValores({ ...valores!, [campo.clave]: e.target.value })}/>
          </label>)}
        </div>
        {aviso && <p className={styles.panelSubtitle} role="status" style={{ marginTop: 14, color: aviso.ok ? "#86f5b7" : "#f2b36b" }}>{aviso.texto}</p>}
        <div style={{ marginTop: 18 }}>
          <button type="button" className={styles.primaryButton} onClick={guardar} disabled={!valores || guardando}>{guardando ? "Guardando..." : "Guardar umbrales"}</button>
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
        <p className={styles.panelSubtitle}>{valores ? "Umbrales guardados en la plataforma." : "Consultando la configuración..."}</p>
        <div className={styles.configSummary}>
          <div><strong>Parámetros guardados</strong>
            <p>Temperatura <b>{valores ? valores.temp_min + " a " + valores.temp_max + " °C" : "—"}</b></p>
            <p>Humedad <b>{valores ? valores.hum_min + " a " + valores.hum_max + " %" : "—"}</b></p>
            <p>Última actualización <b>{actualizado ? new Date(actualizado).toLocaleString("es-CL") : "Valores por defecto"}</b></p>
          </div>
        </div>
      </section>
      <section className={styles.helperPanel}><Icon name="shield" size={21}/><div>
        <strong>Cómo se aplican</strong>
        <p>Al guardar, la Raspberry descarga los umbrales en menos de un minuto y las alertas de las lecturas siguientes usan los valores nuevos. Las alertas ya registradas no se recalculan.</p>
      </div></section>
    </aside>
  </div>;
}
