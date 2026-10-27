"use client";

import { useMemo, useState } from "react";
import styles from "../consulta.module.css";
import { Icon } from "@/components/ui/Icon";
import { type Resumen as Resumen, type PeriodoAPI as Periodo, numero as formatearNumero } from "./ConsultaWidgets";

function formatearFecha(iso: string, incluirFecha = false) {
  return new Intl.DateTimeFormat("es-CL", incluirFecha
    ? { timeZone: "America/Santiago", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
    : { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

const rangoTexto: Record<Periodo, string> = {"1h": "Última hora", "24h": "Últimas 24 horas", "7d": "Últimos 7 días"};

export default function GraficoConjunto({ summaries, periodo }: { summaries: Resumen[]; periodo: Periodo }) {
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

