"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./consulta.module.css";

type Periodo = "1h" | "24h" | "7d";
type Resumen = {
  id: string;
  timestamp: string;
  estado: string;
  alertas: number;
  invalidas: number;
  temperatura_c: number | null;
  humedad_pct: number | null;
  // Campo opcional para cuando el backend publique la telemetria del KY-006.
  buzzer_activo?: boolean | null;
};
type Alerta = {
  id: string;
  timestamp: string;
  estado: "alerta" | "invalida";
  motivos: string[];
};
type RespuestaAPI = {
  summaries: Resumen[];
  alerts: Alerta[];
  counts: { alertas: number; invalidas: number };
};

type Icono =
  | "leaf" | "house" | "chart" | "bell" | "thermo" | "drop"
  | "sound" | "wifi" | "clock" | "chevron" | "refresh"
  | "database" | "user" | "check" | "warning" | "info" | "calendar"
  | "arrow" | "menu" | "close" | "activity";

const rangoTexto: Record<Periodo, string> = {
  "1h": "Última hora",
  "24h": "Últimas 24 horas",
  "7d": "Últimos 7 días",
};

function Icon({ name, size = 21, className = "" }: { name: Icono; size?: number; className?: string }) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.9,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    className, "aria-hidden": true as const,
  };
  switch (name) {
    case "leaf": return <svg {...props}><path d="M21 3C11 3 4 6 4 15a6 6 0 0 0 6 6c9 0 12-8 11-18Z"/><path d="M3 22c4-8 8-12 15-16"/></svg>;
    case "house": return <svg {...props}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/></svg>;
    case "chart": return <svg {...props}><path d="M3 3v18h18"/><path d="m6 16 5-6 4 3 5-7"/></svg>;
    case "bell": return <svg {...props}><path d="M18 9a6 6 0 1 0-12 0c0 6-3 7-3 9h18c0-2-3-3-3-9ZM10 22h4"/></svg>;
    case "thermo": return <svg {...props}><path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M12 9v10"/></svg>;
    case "drop": return <svg {...props}><path d="M12 2C10 6 5 11 5 15a7 7 0 0 0 14 0c0-4-5-9-7-13Z"/><path d="M9 18a4 4 0 0 0 4 1"/></svg>;
    case "sound": return <svg {...props}><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6M18 5a10 10 0 0 1 0 14"/></svg>;
    case "wifi": return <svg {...props}><path d="M2 8a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>;
    case "clock": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></svg>;
    case "chevron": return <svg {...props}><path d="m9 18 6-6-6-6"/></svg>;
    case "refresh": return <svg {...props}><path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 4v7h-7"/></svg>;
    case "database": return <svg {...props}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 2 4 3 9 3s9-1 9-3V5M3 12c0 2 4 3 9 3s9-1 9-3"/></svg>;
    case "user": return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></svg>;
    case "check": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/></svg>;
    case "warning": return <svg {...props}><path d="m12 3 10 18H2L12 3Z"/><path d="M12 10v4M12 18h.01"/></svg>;
    case "info": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>;
    case "calendar": return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
    case "arrow": return <svg {...props}><path d="M4 16 10 10l4 4 6-7M15 7h5v5"/></svg>;
    case "menu": return <svg {...props}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case "close": return <svg {...props}><path d="M5 5 19 19M19 5 5 19"/></svg>;
    case "activity": return <svg {...props}><path d="M2 12h4l3-7 5 14 3-7h5"/></svg>;
  }
}

function validarResumen(v: unknown): v is Resumen {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  const numerico = (n: unknown) => n === null || (typeof n === "number" && Number.isFinite(n));
  return typeof x.id === "string" && typeof x.timestamp === "string"
    && Number.isFinite(Date.parse(x.timestamp)) && typeof x.estado === "string"
    && typeof x.alertas === "number" && typeof x.invalidas === "number"
    && numerico(x.temperatura_c) && numerico(x.humedad_pct)
    && (x.buzzer_activo === undefined || x.buzzer_activo === null || typeof x.buzzer_activo === "boolean");
}

function validarRespuesta(v: unknown): v is RespuestaAPI {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  if (!Array.isArray(x.summaries) || !x.summaries.every(validarResumen) || !Array.isArray(x.alerts)) return false;
  if (!x.counts || typeof x.counts !== "object") return false;
  const counts = x.counts as Record<string, unknown>;
  return typeof counts.alertas === "number" && typeof counts.invalidas === "number"
    && x.alerts.every((a) => {
      if (!a || typeof a !== "object") return false;
      const item = a as Record<string, unknown>;
      return typeof item.id === "string" && typeof item.timestamp === "string"
        && (item.estado === "alerta" || item.estado === "invalida")
        && Array.isArray(item.motivos) && item.motivos.every((m) => typeof m === "string");
    });
}

function datosDemostracion(periodo: Periodo): RespuestaAPI {
  const ahora = Date.now();
  const cantidad = periodo === "1h" ? 60 : periodo === "24h" ? 96 : 100;
  const duracion = periodo === "1h" ? 3_600_000 : periodo === "24h" ? 86_400_000 : 604_800_000;
  const chronological: Resumen[] = Array.from({ length: cantidad }, (_, i) => {
    const x = i / Math.max(1, cantidad - 1);
    const temp = 23.3 + Math.sin(x * 7.0) * 1.8 + Math.sin(x * 29) * .24;
    const hum = 65 + Math.cos(x * 7.5) * 5.2 + Math.sin(x * 32) * 1.2;
    const inAlert = i === Math.floor(cantidad * .32) || i === Math.floor(cantidad * .71);
    return {
      id: `demo-${periodo}-${i}`,
      timestamp: new Date(ahora - duracion + i * duracion / Math.max(1, cantidad - 1)).toISOString(),
      estado: inAlert ? "alerta" : "normal", alertas: inAlert ? 1 : 0, invalidas: 0,
      temperatura_c: Number(temp.toFixed(1)), humedad_pct: Number(hum.toFixed(1)), buzzer_activo: false,
    };
  });
  const alertas: Alerta[] = [
    { id: "demo-a1", timestamp: chronological[Math.floor(cantidad * .71)].timestamp, estado: "alerta", motivos: ["Temperatura alta (simulación)"] },
    { id: "demo-a2", timestamp: chronological[Math.floor(cantidad * .32)].timestamp, estado: "alerta", motivos: ["Humedad baja (simulación)"] },
  ];
  return { summaries: chronological.reverse(), alerts: alertas.reverse(), counts: { alertas: 2, invalidas: 0 } };
}

function formatearNumero(value: number | null | undefined, unit: string): string {
  return value == null ? "—" : `${value.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}`;
}

function formatearFecha(iso: string, includeDate = false): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", includeDate
    ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
    : { hour: "2-digit", minute: "2-digit" }).format(date);
}

function alertaNombre(alerta: Alerta) {
  if (alerta.estado === "invalida") return "Lectura inválida";
  const motivo = alerta.motivos[0]?.toLowerCase() || "";
  if (motivo.includes("temperatura")) return "Temperatura fuera de rango";
  if (motivo.includes("humedad")) return "Humedad fuera de rango";
  return "Alerta ambiental";
}

function GraficoConjunto({ summaries, periodo }: { summaries: Resumen[]; periodo: Periodo }) {
  const [puntoActivo, setPuntoActivo] = useState<number | null>(null);
  const lecturas = useMemo(() => {
    const ordenadas = [...summaries].reverse().filter((r) => r.temperatura_c !== null || r.humedad_pct !== null);
    if (ordenadas.length <= 100) return ordenadas;
    const paso = Math.ceil(ordenadas.length / 100);
    return ordenadas.filter((_, i) => i % paso === 0 || i === ordenadas.length - 1);
  }, [summaries]);

  if (!lecturas.length) return <div className={styles.emptyGraph}>No hay datos para mostrar en el período seleccionado.</div>;

  const izquierdo = 53, derecho = 783, arriba = 24, abajo = 227;
  const temperaturas = lecturas.map((item) => item.temperatura_c).filter((v): v is number => v !== null);
  const tMin = temperaturas.length ? Math.min(...temperaturas) : 15;
  const tMax = temperaturas.length ? Math.max(...temperaturas) : 35;
  const distancia = Math.max(5, tMax - tMin);
  const yMin = Math.floor((tMin - distancia * .25) / 5) * 5;
  const yMax = Math.ceil((tMax + distancia * .25) / 5) * 5;
  const yPosT = (v: number) => abajo - (v - yMin) / (yMax - yMin || 1) * (abajo - arriba);
  const yPosH = (v: number) => abajo - v / 100 * (abajo - arriba);
  const xPos = (i: number) => izquierdo + i * (derecho - izquierdo) / Math.max(lecturas.length - 1, 1);
  const segmentos = (kind: "temperatura_c" | "humedad_pct") => {
    const grupos: string[][] = [];
    lecturas.forEach((r, index) => {
      const value = r[kind];
      if (value === null) { if (grupos.length && grupos[grupos.length - 1].length) grupos.push([]); return; }
      if (!grupos.length) grupos.push([]);
      grupos[grupos.length - 1].push(`${xPos(index).toFixed(2)},${(kind === "temperatura_c" ? yPosT(value) : yPosH(value)).toFixed(2)}`);
    });
    return grupos.filter((g) => g.length);
  };
  const tramosTemp = segmentos("temperatura_c");
  const tramosHum = segmentos("humedad_pct");
  const activo = puntoActivo === null ? null : lecturas[puntoActivo];
  const posicionesEtiqueta = [0, .25, .5, .75, 1].map((proportion) => {
    const index = Math.round(proportion * (lecturas.length - 1));
    return { x: xPos(index), label: formatearFecha(lecturas[index].timestamp, periodo === "7d") };
  });

  return <div className={styles.graphWrap}>
    <svg className={styles.graphSvg} viewBox="0 0 840 280" role="img" aria-label={`Gráfico combinado de temperatura y humedad, ${rangoTexto[periodo]}`}>
      <defs>
        <linearGradient id="consultaTempFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#37df86" stopOpacity=".22"/><stop offset="1" stopColor="#37df86" stopOpacity=".015"/></linearGradient>
        <linearGradient id="consultaHumFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#38baff" stopOpacity=".17"/><stop offset="1" stopColor="#38baff" stopOpacity=".01"/></linearGradient>
      </defs>
      {Array.from({ length: 5 }, (_, i) => {
        const y = arriba + i * (abajo - arriba) / 4;
        return <g key={`y-${i}`}><line x1={izquierdo} x2={derecho} y1={y} y2={y} className={styles.gridLine}/><text x={izquierdo - 12} y={y + 4} textAnchor="end" className={styles.axisText}>{Math.round(yMax - i * (yMax - yMin) / 4)}</text><text x={derecho + 12} y={y + 4} className={styles.axisText}>{100 - i * 25}</text></g>;
      })}
      {posicionesEtiqueta.map((p, i) => <g key={`x-${i}`}><line x1={p.x} x2={p.x} y1={arriba} y2={abajo} className={styles.gridVertical}/><text x={p.x} y={abajo + 22} textAnchor="middle" className={styles.axisText}>{p.label}</text></g>)}
      {tramosTemp.map((seg, i) => <g key={`t-${i}`}>
        {seg.length > 1 && <polygon points={`${seg[0].split(",")[0]},${abajo} ${seg.join(" ")} ${seg[seg.length - 1].split(",")[0]},${abajo}`} fill="url(#consultaTempFill)"/>}
        <polyline points={seg.join(" ")} fill="none" stroke="#42e88b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </g>)}
      {tramosHum.map((seg, i) => <g key={`h-${i}`}>
        {seg.length > 1 && <polygon points={`${seg[0].split(",")[0]},${abajo} ${seg.join(" ")} ${seg[seg.length - 1].split(",")[0]},${abajo}`} fill="url(#consultaHumFill)"/>}
        <polyline points={seg.join(" ")} fill="none" stroke="#35baff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/>
      </g>)}
      {lecturas.map((r, i) => <rect key={r.id} x={xPos(i) - Math.max(3.2, 360 / Math.max(lecturas.length, 1)) / 2} y={arriba} width={Math.max(3.2, 360 / Math.max(lecturas.length, 1))} height={abajo - arriba} fill="transparent" tabIndex={0} role="button" aria-label={`Medición ${formatearFecha(r.timestamp, true)}`} onMouseEnter={() => setPuntoActivo(i)} onFocus={() => setPuntoActivo(i)} onClick={() => setPuntoActivo(i)} />)}
      {activo && puntoActivo !== null && <g pointerEvents="none">
        <line x1={xPos(puntoActivo)} x2={xPos(puntoActivo)} y1={arriba} y2={abajo} stroke="#ffffff" strokeDasharray="3 6" opacity=".3"/>
        {activo.temperatura_c !== null && <circle cx={xPos(puntoActivo)} cy={yPosT(activo.temperatura_c)} r="5" fill="#42e88b" stroke="#071b15" strokeWidth="2"/>}
        {activo.humedad_pct !== null && <circle cx={xPos(puntoActivo)} cy={yPosH(activo.humedad_pct)} r="5" fill="#35baff" stroke="#071b15" strokeWidth="2"/>}
      </g>}
    </svg>
    {activo && puntoActivo !== null && <div className={styles.graphTooltip} role="status">
      <span>{formatearFecha(activo.timestamp, true)}</span>
      <strong><span className={styles.legendDotGreen}/> {formatearNumero(activo.temperatura_c, "°C")}</strong>
      <strong><span className={styles.legendDotBlue}/> {formatearNumero(activo.humedad_pct, "%")}</strong>
      <button type="button" onClick={() => setPuntoActivo(null)} aria-label="Cerrar detalle"><Icon name="close" size={13}/></button>
    </div>}
  </div>;
}

export default function ConsultaCliente({ demoInicial }: { demoInicial: boolean }) {
  const [periodo, setPeriodo] = useState<Periodo>("24h");
  const [demo, setDemo] = useState(demoInicial);
  const [datos, setDatos] = useState<RespuestaAPI>({ summaries: [], alerts: [], counts: { alertas: 0, invalidas: 0 } });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [recargar, setRecargar] = useState(0);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);

  const cargar = useCallback(async (signal: AbortSignal) => {
    if (demo) {
      setDatos(datosDemostracion(periodo));
      setActualizado(new Date());
      setError(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const response = await fetch(`/api/sensores?range=${periodo}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error(`Error HTTP ${response.status}: no se pudieron consultar las mediciones.`);
      const result: unknown = await response.json();
      if (!validarRespuesta(result)) throw new Error("La API devolvió datos con un formato inesperado.");
      if (signal.aborted) return;
      setDatos(result);
      setError(null);
      setActualizado(new Date());
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof Error ? err.message : "Error desconocido al cargar mediciones.");
    } finally {
      if (!signal.aborted) setCargando(false);
    }
  }, [demo, periodo]);

  useEffect(() => {
    const controller = new AbortController();
    const start = window.setTimeout(() => void cargar(controller.signal), 0);
    const timer = !demo && periodo === "1h"
      ? window.setInterval(() => void cargar(controller.signal), 300_000)
      : null;
    return () => {
      controller.abort();
      window.clearTimeout(start);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [cargar, demo, periodo, recargar]);

  const ultimo = datos.summaries[0];
  const ageMs = ultimo && actualizado ? actualizado.getTime() - Date.parse(ultimo.timestamp) : NaN;
  const recientes = Number.isFinite(ageMs) && ageMs >= -60_000 && ageMs <= 5 * 60_000;
  const datoDisponible = !error && !!ultimo;
  const estadoDato = demo ? "Demostración" : error ? "Sin conexión a datos" : !datoDisponible ? "Sin mediciones" : recientes ? "Datos recientes" : "Datos antiguos";
  const buzzer = ultimo?.buzzer_activo;
  const estadoBuzzer = buzzer === true ? "Activo" : buzzer === false ? "Inactivo" : "No reportado";
  const detalleBuzzer = buzzer === true ? "Alerta sonora activa" : buzzer === false ? "Sin alarma reportada" : "Sin telemetría del KY-006";
  const alertas = datos.alerts.slice(0, mostrarTodas ? 8 : 4);
  const statusColor = error || (!demo && !recientes) ? styles.statusOffline : styles.statusOnline;

  const irA = () => setMenuMovil(false);

  return <main className={styles.appShell}>
    <aside className={`${styles.sidebar} ${menuMovil ? styles.sidebarOpen : ""}`}>
      <div className={styles.brand}><span className={styles.logoMark}><Icon name="leaf" size={43}/></span><div><strong>Invernadero IoT</strong><span>Monitoreo Inteligente</span></div></div>
      <nav className={styles.navigation} aria-label="Menú del usuario de consulta">
        <a className={styles.navActive} onClick={irA} href="#inicio"><Icon name="house" size={22}/> Inicio</a>
        <a onClick={irA} href="#historial"><Icon name="chart" size={22}/> Historial</a>
        <a onClick={irA} href="#alertas"><Icon name="bell" size={22}/> Alertas</a>
      </nav>
      <div className={styles.sidebarSlogan}><Icon name="leaf" size={30}/> <span>Cultivando<br/>un futuro <strong>más verde</strong></span></div>
    </aside>

    {menuMovil && <button type="button" className={styles.mobileOverlay} onClick={() => setMenuMovil(false)} aria-label="Cerrar menú lateral"/>}

    <div className={styles.contentShell}>
      <header className={styles.topbar} id="inicio">
        <button type="button" className={styles.menuMobileButton} aria-label="Abrir menú" onClick={() => setMenuMovil(true)}><Icon name="menu"/></button>
        <div className={styles.headline}><h1>Panel de consulta del invernadero</h1><p>Monitoreo en tiempo real de las condiciones ambientales</p></div>
        <span className={`${styles.systemPill} ${statusColor}`}><span className={styles.statusPoint}/>{estadoDato}</span>
        <div className={styles.headerActions}>
          <a href="#alertas" className={styles.headerBell} aria-label={`Ir a alertas: ${datos.counts.alertas + datos.counts.invalidas} eventos`}><Icon name="bell" size={21}/>{datos.counts.alertas + datos.counts.invalidas > 0 && <span className={styles.alertCount}>{datos.counts.alertas + datos.counts.invalidas}</span>}</a>
          <div className={styles.userPill}><span className={styles.avatar}><Icon name="user" size={19}/></span><span>Usuario de consulta</span></div>
        </div>
      </header>

      <div className={styles.pageBody}>
        {demo && <div className={styles.demoStrip} role="status"><Icon name="info" size={17}/> Vista de demostración: los valores son simulados y no provienen de Firebase. <button type="button" onClick={() => setDemo(false)}>Volver a datos reales</button></div>}
        {error && !demo && <div className={styles.errorStrip} role="alert"><Icon name="warning" size={17}/> {error} <button type="button" onClick={() => setDemo(true)}>Probar demo</button></div>}

        <section className={`row g-3 ${styles.metricsRow}`} aria-label="Indicadores del invernadero">
          <div className="col-12 col-md-4"><article className={`${styles.metricCard} ${styles.tempCard}`}><span className={`${styles.metricIcon} ${styles.tempIcon}`}><Image src="/iconos/temperatura@2x.png" width={64} height={64} alt="" className={styles.metricAsset} unoptimized/></span><div><p>Temperatura actual</p><strong>{formatearNumero(ultimo?.temperatura_c, "°C")}</strong><span className={styles.cardFoot}><Icon name="activity" size={15}/> {ultimo ? (ultimo.estado === "alerta" ? "Revisar alertas" : "Última medición") : "Sin datos"}</span></div></article></div>
          <div className="col-12 col-md-4"><article className={`${styles.metricCard} ${styles.humCard}`}><span className={`${styles.metricIcon} ${styles.humIcon}`}><Image src="/iconos/humedad@2x.png" width={64} height={64} alt="" className={styles.metricAsset} unoptimized/></span><div><p>Humedad actual</p><strong>{formatearNumero(ultimo?.humedad_pct, "%")}</strong><span className={styles.cardFoot}><Icon name="activity" size={15}/> {ultimo ? (ultimo.estado === "alerta" ? "Revisar alertas" : "Última medición") : "Sin datos"}</span></div></article></div>
          <div className="col-12 col-md-4"><article className={`${styles.metricCard} ${styles.buzzerCard}`}><span className={`${styles.metricIcon} ${styles.buzzerIcon}`}><Image src="/iconos/buzzer@2x.png" width={64} height={64} alt="" className={styles.metricAsset} unoptimized/></span><div><p>Estado del buzzer</p><strong className={styles.buzzerText}>{estadoBuzzer}</strong><span className={styles.cardFoot}>{detalleBuzzer}</span></div></article></div>
        </section>

        <div className={`row g-3 ${styles.mainGrid}`}>
          <div className="col-12 col-xl-8 d-flex flex-column gap-3">
            <section className={styles.panel} id="historial" aria-labelledby="historico-titulo">
              <div className={styles.panelHeader}>
                <div className={styles.panelHeaderTitle}><Icon name="clock" size={24}/><h2 id="historico-titulo">Historial de datos <span>({rangoTexto[periodo]})</span></h2></div>
                <div className={styles.graphControls}>
                  <div className={styles.legend}><span><i className={styles.legendDotGreen}/>Temperatura (°C)</span><span><i className={styles.legendDotBlue}/>Humedad (%)</span></div>
                  <select className={styles.rangeSelect} aria-label="Rango del historial" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}><option value="1h">Última hora</option><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 días</option></select>
                  <button type="button" className={styles.refreshButton} title="Actualizar datos" aria-label="Actualizar datos" onClick={() => setRecargar((n) => n + 1)} disabled={cargando}><Icon name="refresh" size={17}/></button>
                </div>
              </div>
              <GraficoConjunto summaries={datos.summaries} periodo={periodo}/>
              <div className={styles.chartFoot}><span>{actualizado ? `Consultado ${actualizado.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` : "Esperando primera consulta"}</span><span>Los ejes muestran °C y % por separado</span></div>
            </section>

            <section className={styles.panel} id="mediciones" aria-labelledby="mediciones-titulo">
              <div className={styles.panelHeader}><div className={styles.panelHeaderTitle}><Icon name="database" size={24}/><h2 id="mediciones-titulo">Últimas mediciones</h2></div><a href="#historial" onClick={() => setPeriodo("7d")} className={styles.textLink}>Ver historial <Icon name="chevron" size={15}/></a></div>
              <div className="table-responsive"><table className={styles.measurementsTable}><thead><tr><th>Hora</th><th>Temperatura (°C)</th><th>Humedad (%)</th><th>Estado del buzzer</th></tr></thead><tbody>{datos.summaries.slice(0, 5).map((r) => <tr key={r.id}><td>{formatearFecha(r.timestamp)}</td><td>{formatearNumero(r.temperatura_c, "")}</td><td>{formatearNumero(r.humedad_pct, "")}</td><td><span className={`${styles.tableState} ${r.buzzer_activo === true ? styles.tableAlert : r.buzzer_activo === false ? styles.tableNormal : styles.tableInvalid}`}><span/> {r.buzzer_activo === true ? "Activo" : r.buzzer_activo === false ? "Inactivo" : "No reportado"}</span></td></tr>)}{!datos.summaries.length && <tr><td colSpan={4} className={styles.emptyTable}>No hay mediciones para este período.</td></tr>}</tbody></table></div>
            </section>
          </div>

          <div className="col-12 col-xl-4">
            <section className={`${styles.panel} ${styles.alertPanel}`} id="alertas" aria-labelledby="alertas-titulo">
              <div className={styles.panelHeader}><div className={styles.panelHeaderTitle}><Icon name="bell" size={24}/><h2 id="alertas-titulo">Alertas recientes</h2></div><button type="button" className={styles.textLink} onClick={() => setMostrarTodas((v) => !v)}>{mostrarTodas ? "Ver menos" : "Ver todas"} <Icon name="chevron" size={15}/></button></div>
              <div className={styles.alertsStack}>{alertas.map((a) => <article key={a.id} className={styles.alertItem}><div className={`${styles.alertSymbol} ${a.estado === "invalida" ? styles.alertSymbolInvalid : styles.alertSymbolDanger}`}><Icon name={a.estado === "invalida" ? "warning" : a.motivos.join(" ").toLowerCase().includes("humedad") ? "drop" : "thermo"} size={24}/></div><div className={styles.alertCopy}><strong>{alertaNombre(a)}</strong><p>{a.motivos.join(" · ") || "Evento registrado"}</p><small>{formatearFecha(a.timestamp, true)}</small></div><span className={`${styles.alertTag} ${a.estado === "invalida" ? styles.invalidTag : styles.dangerTag}`}>{a.estado === "invalida" ? "Inválida" : "Alerta"}</span></article>)}{!alertas.length && <div className={styles.emptyAlerts}><Icon name="check" size={29}/><strong>Sin alertas registradas</strong><span>En el período seleccionado no se registraron alertas.</span></div>}</div>
              <div className={styles.alertFooter}>Alertas: {datos.counts.alertas} · Lecturas inválidas: {datos.counts.invalidas}</div>
            </section>
          </div>
        </div>
        <p className={styles.smallFooter}>Datos del DHT22 · Acceso de solo consulta · {demo ? "Simulación activa" : "Origen: API /api/sensores"}</p>
      </div>
    </div>
  </main>;
}
