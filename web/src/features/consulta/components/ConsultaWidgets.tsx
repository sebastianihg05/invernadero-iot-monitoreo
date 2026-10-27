"use client";

import styles from "../vistas.module.css";

export type Periodo = "1h" | "24h" | "7d" | "personalizado";
export type PeriodoAPI = Exclude<Periodo, "personalizado">;
export type FiltroCondicion = "todos" | "normal" | "alerta" | "invalida";
export type FiltroTipo = "todos" | "alerta" | "invalida";
export type Origen = "todos" | "temperatura" | "humedad" | "otro";
export type Orden = "timestamp" | "temperatura_c" | "humedad_pct" | "vpd_kpa" | "estado";
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
export type Datos = { summaries: Resumen[]; alerts: Alerta[]; counts: { alertas: number; invalidas: number } };

export const VACIO: Datos = { summaries: [], alerts: [], counts: { alertas: 0, invalidas: 0 } };
export const periodos: { value: Periodo; label: string }[] = [
  { value: "1h", label: "Última hora" },
  { value: "24h", label: "Últimas 24 horas" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "personalizado", label: "Rango personalizado" },
];

export function esResumen(v: unknown): v is Resumen {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  const n = (a: unknown) => a === null || (typeof a === "number" && Number.isFinite(a));
  return typeof x.id === "string" && typeof x.timestamp === "string" && Number.isFinite(Date.parse(x.timestamp))
    && typeof x.estado === "string" && typeof x.alertas === "number" && typeof x.invalidas === "number"
    && n(x.temperatura_c) && n(x.humedad_pct)
    && (x.vpd_kpa === undefined || n(x.vpd_kpa))
    && (x.buzzer_activo === undefined || x.buzzer_activo === null || typeof x.buzzer_activo === "boolean");
}
export function parsearRespuesta(v: unknown): Datos {
  if (!v || typeof v !== "object") throw new Error("La API devolvió una respuesta inválida.");
  const x = v as Record<string, unknown>;
  if (!Array.isArray(x.summaries) || !x.summaries.every(esResumen) || !Array.isArray(x.alerts)) {
    throw new Error("La API no devolvió el formato de mediciones esperado.");
  }
  const alerts = x.alerts as unknown[];
  if (!alerts.every((a) => !!a && typeof a === "object" &&
    typeof (a as Alerta).id === "string" && typeof (a as Alerta).timestamp === "string" &&
    Number.isFinite(Date.parse((a as Alerta).timestamp)) &&
    ["alerta", "invalida"].includes((a as Alerta).estado) &&
    Array.isArray((a as Alerta).motivos) && (a as Alerta).motivos.every((m) => typeof m === "string"))) {
    throw new Error("La API devolvió alertas con un formato inesperado.");
  }
  const resumen = x.summaries as Resumen[];
  const alertas = alerts as Alerta[];
  return {
    summaries: [...resumen].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    alerts: [...alertas].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    counts: { alertas: alertas.filter((a) => a.estado === "alerta").length, invalidas: alertas.filter((a) => a.estado === "invalida").length },
  };
}

export const numero = (n: number | null | undefined, unidad = "") => n == null ? "—" : `${n.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${unidad ? ` ${unidad}` : ""}`;
export const fecha = (s: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(s));
export const hora = (s: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" }).format(new Date(s));
export const soloDia = (s: string) => {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(s));
};
export function condicion(r: Resumen): FiltroCondicion {
  if (r.estado.toLowerCase().includes("inval") || r.invalidas > 0) return "invalida";
  if (r.estado.toLowerCase().includes("alert") || r.alertas > 0) return "alerta";
  return "normal";
}
export function tipoAlerta(a: Alerta): Exclude<Origen, "todos"> {
  const t = a.motivos.join(" ").toLowerCase();
  if (t.includes("temperatura")) return "temperatura";
  if (t.includes("humedad")) return "humedad";
  return "otro";
}
export function nombreAlerta(a: Alerta) {
  if (a.estado === "invalida") return "Lectura inválida";
  const t = a.motivos.join(" ").toLowerCase();
  if (t.includes("temperatura")) return t.includes("baja") ? "Temperatura baja" : t.includes("alta") ? "Temperatura alta" : "Temperatura fuera de rango";
  if (t.includes("humedad")) return t.includes("baja") ? "Humedad baja" : t.includes("alta") ? "Humedad alta" : "Humedad fuera de rango";
  return "Alerta ambiental";
}

export function MiniTendencia({ alertas, periodo, referencia }: { alertas: Alerta[]; periodo: Periodo; referencia: number }) {
  const ahora = referencia || (alertas.length ? Math.max(...alertas.map((a) => Date.parse(a.timestamp))) : 0);
  const duracion = periodo === "1h" ? 3_600_000 : periodo === "7d" ? 604_800_000 : 86_400_000;
  const comienzo = ahora - duracion;
  const grupos = Array.from({ length: 12 }, (_, i) => {
    const inicio = comienzo + i * duracion / 12;
    const fin = comienzo + (i + 1) * duracion / 12;
    const rango = alertas.filter((a) => Date.parse(a.timestamp) >= inicio && Date.parse(a.timestamp) < (i === 11 ? fin + 1 : fin));
    return { alertas: rango.filter((a) => a.estado === "alerta").length, invalidas: rango.filter((a) => a.estado === "invalida").length };
  });
  const maximo = Math.max(1, ...grupos.map((g) => g.alertas + g.invalidas));
  return <div className={styles.trendChart} role="img" aria-label="Cantidad de alertas y lecturas inválidas distribuidas en el período">
    {grupos.map((g, i) => <div key={i} className={styles.barGroup} title={`Intervalo ${i + 1}: ${g.alertas} alertas, ${g.invalidas} lecturas inválidas`}>
      <span className={styles.redBar} style={{ height: `${Math.max(3, g.alertas / maximo * 100)}%`, opacity: g.alertas ? 1 : .13 }}/>
      <span className={styles.yellowBar} style={{ height: `${Math.max(3, g.invalidas / maximo * 100)}%`, opacity: g.invalidas ? 1 : .13 }}/>
    </div>)}
  </div>;
}

