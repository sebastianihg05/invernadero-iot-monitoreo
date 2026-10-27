"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../admin.module.css";
import { useAdminPanel } from "../AdminContext";
import { Icon, TablaLecturas, TarjetaResumen, fecha, fechaISOChile, type IconName } from "../components/AdminWidgets";
import { fetchConSesion } from "@/lib/sesionCliente";

type Modo = "auto" | "silenciado" | "activado";
type Regla = "temperatura" | "humedad" | "sensor" | "conectividad";
type ConfigBuzzer = { modo: Modo; reglas: Record<Regla, boolean> };

const nombreModo: Record<Modo, string> = { auto: "Automático", silenciado: "Silenciado", activado: "Activado" };
const detalleModo: Record<Modo, string> = {
  auto: "Suena cuando se cumple una regla",
  silenciado: "No suena aunque haya alertas",
  activado: "Suena hasta que se silencie",
};

const reglas: { clave: Regla; icono: IconName; titulo: string; descripcion: string }[] = [
  { clave: "temperatura", icono: "thermo", titulo: "Temperatura fuera de rango", descripcion: "Cuando la temperatura sale de los umbrales configurados" },
  { clave: "humedad", icono: "drop", titulo: "Humedad fuera de rango", descripcion: "Cuando la humedad sale del intervalo definido" },
  { clave: "conectividad", icono: "wifi", titulo: "Pérdida de telemetría", descripcion: "Si pasan 2 minutos sin recibir lecturas del sensor" },
  { clave: "sensor", icono: "sensor", titulo: "Fallo de sensor", descripcion: "Ante una lectura inválida o un sensor con error" },
];

export default function Buzzer() {
  const { estadoBuzzer, lecturas, ultima } = useAdminPanel();
  const [config, setConfig] = useState<ConfigBuzzer | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetchConSesion("/api/configuracion", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.buzzer) throw new Error(json?.error || "No se pudo leer el estado del buzzer.");
      setConfig(json.buzzer);
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof Error ? e.message : "No se pudo leer el estado del buzzer." });
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function enviar(orden: object, textoOk: string) {
    setEnviando(true);
    setAviso(null);
    try {
      const res = await fetchConSesion("/api/buzzer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orden) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "No se pudo enviar la orden.");
      setAviso({ ok: true, texto: textoOk });
      await cargar();
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof Error ? e.message : "No se pudo enviar la orden." });
    } finally {
      setEnviando(false);
    }
  }

  const modo = config?.modo;
  const activaciones = lecturas.filter((l) => l.buzzer_activo === true);
  const ultimaActivacion = activaciones[0];
  const bloqueado = !config || enviando;

  return <>
    <div className={styles.statRow}>
      <TarjetaResumen icono="speaker" titulo="Estado actual" valor={estadoBuzzer} detalle="Telemetría del KY-006" tono="neutro"/>
      <TarjetaResumen icono="settings" titulo="Modo del buzzer" valor={modo ? nombreModo[modo] : "Consultando..."} detalle={modo ? detalleModo[modo] : "Leyendo la configuración"} tono="verde"/>
      <TarjetaResumen icono="clock" titulo="Última activación" valor={ultimaActivacion ? fecha(ultimaActivacion.timestamp) : "—"} detalle={ultimaActivacion ? fechaISOChile(ultimaActivacion.timestamp) : "Sin activaciones en el período"} tono="neutro"/>
      <TarjetaResumen icono="sensor" titulo="Pin GPIO" valor={ultima?.buzzer_pin != null ? `GPIO ${ultima.buzzer_pin}` : "—"} detalle={ultima?.buzzer_pin != null ? "Informado por el dispositivo" : "No informado por el dispositivo"} tono="azul"/>
    </div>
    <div className={styles.buzzerLayout}>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><Icon name="sliders"/><h3>Panel de control</h3></div>
        <p className={styles.panelSubtitle}>Las órdenes se guardan en la plataforma y la Raspberry las aplica en menos de un minuto.</p>
        <div className={styles.buzzerControlInner}>
          <div className={styles.buzzerIndicator}>
            <span className={styles.buzzerCircle}><Icon name="speaker" size={52}/></span>
            <h3>{estadoBuzzer}</h3>
            <p>Estado reportado por la última lectura</p>
          </div>
          <div className={styles.buzzerControlActions}>
            <div className={styles.controlRow}>
              <div><strong>Modo automático</strong><p>Suena según las reglas de activación</p></div>
              <button type="button" role="switch" aria-checked={modo === "auto"} aria-label="Modo automático" disabled={bloqueado}
                className={`${styles.switch} ${modo === "auto" ? styles.switchOn : ""}`}
                onClick={() => enviar({ modo: modo === "auto" ? "silenciado" : "auto" }, modo === "auto" ? "Buzzer silenciado." : "Modo automático activado.")}><span/></button>
            </div>
            <div className={styles.buttonTrio}>
              <button className={styles.primaryButton} type="button" disabled={bloqueado} onClick={() => enviar({ probar: true }, "Prueba enviada: el buzzer da un pitido corto.")}><Icon name="play" size={16}/>Probar buzzer</button>
              <button className={styles.secondaryButton} type="button" disabled={bloqueado || modo === "silenciado"} onClick={() => enviar({ modo: "silenciado" }, "Buzzer silenciado.")}><Icon name="speaker" size={16}/>Silenciar</button>
              <button className={styles.secondaryButton} type="button" disabled={bloqueado || modo === "activado"} onClick={() => enviar({ modo: "activado" }, "Buzzer activado: suena hasta que lo silencies.")}><Icon name="power" size={16}/>Activar</button>
            </div>
          </div>
        </div>
        {aviso
          ? <div className={styles.warningBox} role="status"><Icon name={aviso.ok ? "info" : "warning"} size={18}/><span>{aviso.texto}</span></div>
          : <div className={styles.warningBox}><Icon name="info" size={18}/><span>El estado actual se actualiza con la siguiente lectura. «Activar» hace sonar el buzzer sin parar hasta que se silencie.</span></div>}
      </section>
      <section className={styles.panel}>
        <div className={styles.panelTitle}><Icon name="settings"/><h3>Reglas de activación</h3></div>
        <p className={styles.panelSubtitle}>Qué condiciones hacen sonar el buzzer en modo automático. La alerta se registra igual.</p>
        <div className={styles.ruleList}>{reglas.map((r) => {
          const activa = config?.reglas[r.clave] ?? false;
          return <div key={r.clave}>
            <span className={styles.ruleIcon}><Icon name={r.icono}/></span>
            <div><strong>{r.titulo}</strong><small>{r.descripcion}</small></div>
            <span className={styles.unknownPill}>{config ? (activa ? "Activa" : "Desactivada") : "..."}</span>
            <button type="button" role="switch" aria-checked={activa} aria-label={`${r.titulo}`} disabled={bloqueado}
              className={`${styles.switch} ${activa ? styles.switchOn : ""}`}
              onClick={() => enviar({ regla: r.clave, activa: !activa }, `Regla «${r.titulo}» ${activa ? "desactivada" : "activada"}.`)}><span/></button>
          </div>;
        })}</div>
      </section>
    </div>
    <section className={`${styles.panel} ${styles.buzzerHistory}`}>
      <div className={styles.panelHeader}><div className={styles.panelTitle}><Icon name="history"/><h3>Historial de activaciones</h3></div></div>
      <p className={styles.panelSubtitle}>Minutos en que el buzzer sonó, según los resúmenes del período seleccionado.</p>
      <TablaLecturas lecturas={activaciones} vacio="No hay activaciones del buzzer en el período."/>
    </section>
  </>;
}
