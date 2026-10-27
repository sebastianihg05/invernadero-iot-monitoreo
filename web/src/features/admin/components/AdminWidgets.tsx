"use client";

import { useMemo } from "react";
import { formatoVpd } from "@/lib/vpd";
import { Icon, type IconName } from "@/components/ui/Icon";
export { Icon };
export type { IconName };
import styles from "../admin.module.css";

export type Seccion = "inicio" | "sensores" | "alertas" | "configuracion" | "buzzer" | "usuarios" | "historial";
export type Periodo = "1h" | "24h" | "7d";
export type EstadoLectura = "Normal" | "Alerta" | "Inválida";

export type Resumen = {
  id: string;
  timestamp: string;
  estado: string;
  alertas: number;
  invalidas: number;
  temperatura_c: number | null;
  humedad_pct: number | null;
  vpd_kpa?: number | null;
  buzzer_activo?: boolean | null;
};
export type Alerta = { id: string; timestamp: string; estado: "alerta" | "invalida"; motivos: string[] };
export type RespuestaAPI = { summaries: Resumen[]; alerts: Alerta[]; counts: { alertas: number; invalidas: number } };

function esNumeroONulo(valor: unknown): boolean {
  return valor === null || (typeof valor === "number" && Number.isFinite(valor));
}
function esResumen(valor: unknown): valor is Resumen {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return false;
  const r = valor as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.timestamp === "string"
    && Number.isFinite(Date.parse(r.timestamp)) && typeof r.estado === "string"
    && typeof r.alertas === "number" && typeof r.invalidas === "number"
    && esNumeroONulo(r.temperatura_c) && esNumeroONulo(r.humedad_pct)
    && (r.vpd_kpa === undefined || esNumeroONulo(r.vpd_kpa))
    && (r.buzzer_activo === undefined || r.buzzer_activo === null || typeof r.buzzer_activo === "boolean");
}
export function esRespuestaAPI(valor: unknown): valor is RespuestaAPI {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return false;
  const x = valor as Record<string, unknown>;
  if (!Array.isArray(x.summaries) || !x.summaries.every(esResumen) || !Array.isArray(x.alerts)) return false;
  if (!x.counts || typeof x.counts !== "object") return false;
  const counts = x.counts as Record<string, unknown>;
  return typeof counts.alertas === "number" && typeof counts.invalidas === "number"
    && x.alerts.every((a) => {
      if (!a || typeof a !== "object") return false;
      const r = a as Record<string, unknown>;
      return typeof r.id === "string" && typeof r.timestamp === "string"
        && Number.isFinite(Date.parse(r.timestamp))
        && (r.estado === "alerta" || r.estado === "invalida")
        && Array.isArray(r.motivos) && r.motivos.every((m) => typeof m === "string");
    });
}
export function numero(valor: number | null | undefined, unidad: string): string {
  return valor == null ? "—" : `${valor.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unidad}`;
}
export function fecha(iso: string, fechaCompleta = false): string {
  const valor = new Date(iso);
  if (!Number.isFinite(valor.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", fechaCompleta
    ? { timeZone: "America/Santiago", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
    : { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" }).format(valor);
}
export function fechaISOChile(iso: string): string {
  const valor = new Date(iso);
  return Number.isFinite(valor.getTime())
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(valor)
    : "";
}
export function estadoLectura(lectura: Resumen): EstadoLectura {
  return lectura.invalidas > 0 || lectura.estado.toLowerCase().includes("inval") ? "Inválida"
    : lectura.alertas > 0 || lectura.estado.toLowerCase().includes("alert") ? "Alerta" : "Normal";
}
export function tituloAlerta(a: Alerta): string {
  if (a.estado === "invalida") return "Lectura inválida";
  const motivo = a.motivos.join(" ").toLowerCase();
  if (motivo.includes("temperatura")) return "Temperatura fuera de rango";
  if (motivo.includes("humedad")) return "Humedad fuera de rango";
  return "Alerta ambiental";
}
export function estadoConexion(ultima: Resumen | undefined, horaConsulta: number, error: string): "reciente" | "atrasado" | "desconocido" {
  if (!ultima || error || !horaConsulta) return "desconocido";
  const antiguedad = horaConsulta - new Date(ultima.timestamp).getTime();
  return antiguedad >= 0 && antiguedad <= 180_000 ? "reciente" : "atrasado";
}

export function Grafico({ lecturas }: { lecturas: Resumen[] }) {
  const orden = useMemo(() => {
    const entradas = [...lecturas].reverse().filter(l => l.temperatura_c !== null || l.humedad_pct !== null);
    if (entradas.length <= 100) return entradas;
    const paso = Math.ceil(entradas.length / 100);
    return entradas.filter((_, i) => i % paso === 0 || i === entradas.length - 1);
  }, [lecturas]);
  if (!orden.length) return <div className={styles.chartEmpty}><Icon name="chart" size={32}/><span>No hay mediciones disponibles para graficar.</span></div>;

  const inicio = 54, fin = 782, arriba = 22, abajo = 215;
  const temperaturas = orden.map(l => l.temperatura_c).filter((n): n is number => n !== null);
  const tMin = temperaturas.length ? Math.min(...temperaturas) : 15;
  const tMax = temperaturas.length ? Math.max(...temperaturas) : 35;
  const margen = Math.max(2, (tMax - tMin) * .25);
  const minEscala = Math.floor((tMin - margen) / 5) * 5;
  const maxEscala = Math.ceil((tMax + margen) / 5) * 5;
  const x = (i: number) => inicio + (i * (fin - inicio)) / Math.max(1, orden.length - 1);
  const yT = (t: number) => abajo - ((t - minEscala) / Math.max(1, maxEscala - minEscala)) * (abajo - arriba);
  const yH = (h: number) => abajo - (h / 100) * (abajo - arriba);
  const segmentos = (clave: "temperatura_c" | "humedad_pct") => {
    const grupos: string[][] = [];
    let actual: string[] = [];
    orden.forEach((lectura, i) => {
      const valor = lectura[clave];
      if (valor === null) { if (actual.length) grupos.push(actual); actual = []; }
      else actual.push(`${x(i).toFixed(1)},${(clave === "temperatura_c" ? yT(valor) : yH(valor)).toFixed(1)}`);
    });
    if (actual.length) grupos.push(actual);
    return grupos;
  };
  const gruposTemp = segmentos("temperatura_c"), gruposHum = segmentos("humedad_pct");
  return <div className={styles.chartFrame}>
    <svg viewBox="0 0 840 267" className={styles.lineChart} role="img" aria-label="Gráfico de las mediciones reales obtenidas de la API de sensores">
      <defs>
        <linearGradient id="adminTempFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#39ec91" stopOpacity=".22"/><stop offset="1" stopColor="#39ec91" stopOpacity="0"/></linearGradient>
        <linearGradient id="adminHumFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#39baff" stopOpacity=".12"/><stop offset="1" stopColor="#39baff" stopOpacity="0"/></linearGradient>
      </defs>
      {[0,1,2,3,4].map(i => <g key={i}>
        <line x1={inicio} y1={arriba + (abajo-arriba)*i/4} x2={fin} y2={arriba + (abajo-arriba)*i/4} className={styles.chartGrid}/>
        <text x={inicio-12} y={arriba+4+(abajo-arriba)*i/4} textAnchor="end" className={styles.chartLabel}>{(maxEscala-(maxEscala-minEscala)*i/4).toFixed(0)}</text>
        <text x={fin+12} y={arriba+4+(abajo-arriba)*i/4} className={styles.chartLabel}>{100-25*i}</text>
      </g>)}
      {[0,.25,.5,.75,1].map((f,i) => { const j = Math.round((orden.length-1)*f); return <g key={i}>
        <line x1={x(j)} y1={arriba} x2={x(j)} y2={abajo} className={styles.chartGridVertical}/>
        <text x={x(j)} y={abajo+25} textAnchor="middle" className={styles.chartLabel}>{fecha(orden[j].timestamp)}</text>
      </g>; })}
      {gruposHum.map((p,i) => <g key={`h-${i}`}>
        {p.length>1 && <polygon points={`${p[0].split(",")[0]},${abajo} ${p.join(" ")} ${p[p.length-1].split(",")[0]},${abajo}`} fill="url(#adminHumFill)"/>}
        <polyline points={p.join(" ")} fill="none" stroke="#39baff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </g>)}
      {gruposTemp.map((p,i) => <g key={`t-${i}`}>
        {p.length>1 && <polygon points={`${p[0].split(",")[0]},${abajo} ${p.join(" ")} ${p[p.length-1].split(",")[0]},${abajo}`} fill="url(#adminTempFill)"/>}
        <polyline points={p.join(" ")} fill="none" stroke="#45eb93" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/>
      </g>)}
    </svg>
  </div>;
}

export function TextoEstado({ estado }: { estado: EstadoLectura }) {
  return <span className={`${styles.stateBadge} ${estado === "Normal" ? styles.stateNormal : estado === "Alerta" ? styles.stateAlert : styles.stateInvalid}`}><span className={styles.stateDot}/>{estado}</span>;
}

export function TablaLecturas({ lecturas, vacio }: { lecturas: Resumen[]; vacio: string }) {
  return <div className={styles.tableScroll}><table className={styles.dataTable}>
    <thead><tr><th>Fecha</th><th>Hora</th><th>Temperatura</th><th>Humedad</th><th>VPD (kPa)</th><th>Estado</th></tr></thead>
    <tbody>{lecturas.map(l => <tr key={l.id}><td>{fechaISOChile(l.timestamp)}</td><td>{fecha(l.timestamp)}</td><td>{numero(l.temperatura_c,"°C")}</td><td>{numero(l.humedad_pct,"%")}</td><td>{formatoVpd(l.vpd_kpa)}</td><td><TextoEstado estado={estadoLectura(l)}/></td></tr>)}
    {!lecturas.length && <tr><td colSpan={6} className={styles.emptyTable}>{vacio}</td></tr>}</tbody>
  </table></div>;
}


export type RegistroEvento = {
  id: string;
  timestamp: string;
  tipo: "Medición" | "Alerta" | "Inválida";
  origen: string;
  descripcion: string;
  estado: string;
};

export function TarjetaResumen({ icono, titulo, valor, detalle, tono = "verde" }: { icono: IconName; titulo: string; valor: string; detalle: string; tono?: "verde" | "azul" | "rojo" | "ambar" | "neutro" }) {
  return <article className={`${styles.statTile} ${styles[`tile_${tono}`]}`}>
    <span className={styles.statTileIcon}><Icon name={icono} size={27}/></span>
    <div className={styles.statTileText}><span>{titulo}</span><strong>{valor}</strong><small>{detalle}</small></div>
  </article>;
}

export function ResumenDonut({ ambientales, invalidas }: { ambientales: number; invalidas: number }) {
  const total = ambientales + invalidas;
  const porcentaje = total ? (ambientales / total) * 100 : 0;
  return <div className={styles.donutZone}>
    <div className={styles.donut} style={{ background: total ? `conic-gradient(#f2b748 0% ${porcentaje}%, #ef5a69 ${porcentaje}% 100%)` : "conic-gradient(#2b4750 0% 100%)" }}>
      <div className={styles.donutCenter}><strong>{total}</strong><span>eventos</span></div>
    </div>
    <div className={styles.donutLegend}>
      <div><span><i className={styles.dotAmber}/>Alertas ambientales</span><strong>{ambientales}</strong></div>
      <div><span><i className={styles.dotRed}/>Lecturas inválidas</span><strong>{invalidas}</strong></div>
    </div>
  </div>;
}

export function descargarCSV(filas: string[][], nombre: string) {
  const contenido = filas.map(f => f.map(c => {
    const celda = String(c);
    const seguro = /^[\s]*[=+@-]/.test(celda) ? "'" + celda : celda;
    return `"${seguro.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", contenido], {type: "text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

