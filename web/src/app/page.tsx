"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '../lib/firebaseClient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import styles from './page.module.css';
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Autenticar credenciales en Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Buscar el documento del usuario en Firestore para leer su rol
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const rol = userData.rol;

        // 3. Redirigir dinámicamente según el rol
        if (rol === 'admin') {
          router.push('/admin');
        } else {
          router.push('/consulta');
        }
      } else {
        alert("Error: El usuario está autenticado pero no tiene perfil en la base de datos.");
        auth.signOut();
      }
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        alert("Correo o contraseña incorrectos.");
      } else {
        alert("Ocurrió un error al intentar iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <img src="/hoja.png" alt="Logo Invernadero" className={styles.logoIcon} />
          </div>
          <div>
            <h1 className={styles.title}>Invernadero IoT</h1>
            <p className={styles.subtitle}>Monitoreo Inteligente</p>
          </div>
        </div>

        <div className={styles.headingGroup}>
          <h2 className={styles.heading}>Inicia sesión</h2>
          <p className={styles.description}>
            Accede a la plataforma para consultar el estado de tus cultivos.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputGroup}>
            <label>Correo electrónico</label>
            <div className={styles.inputWrapper}>
              <img src="/correo.png" alt="Correo" className={styles.iconImage} />
              <input 
                type="email" 
                placeholder="tu.correo@unab.cl" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Contraseña</label>
            <div className={styles.inputWrapper}>
              <img src="/candado.png" alt="Candado" className={styles.iconImage} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Ingresa tu contraseña" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <img 
                src="/ojo.png" 
                alt="Ver" 
                className={styles.iconImage} 
                style={{ cursor: 'pointer', opacity: showPassword ? 1 : 0.5 }} 
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>

          <div className={styles.options}>
            <label className={styles.checkbox}>
              <input type="checkbox" disabled={loading} />
              <span className={styles.checkmark}></span>
              Recordarme
            </label>
            <Link href="#" className={styles.link}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            <img src="/flecha.png" alt="Entrar" className={styles.btnIcon} /> 
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <p className={styles.footerText}>
          ¿No tienes una cuenta? <Link href="/register" className={styles.link}>Regístrate aquí</Link>
        </p>
      </div>
    </div>


type Summary = {
  id: string;
  timestamp: string;
  estado: string;
  alertas: number;
  invalidas: number;
  temperatura_c: number | null;
  humedad_pct: number | null;
};

type AlertEvent = {
  id: string;
  timestamp: string;
  estado: "alerta" | "invalida";
  motivos: string[];
};

type AlertCounts = {
  alertas: number;
  invalidas: number;
};

type Reading = {
  timestamp: string;
  value: number;
};

type HistoryChartProps = {
  title: string;
  unit: string;
  color: string;
  readings: Reading[];
  range: "1h" | "24h" | "7d";
  min: number;
  max: number;
  id: string;
};

function isSummary(value: unknown): value is Summary {
  if (!value || typeof value !== "object") return false;

  const summary = value as Record<string, unknown>;
  return (
    typeof summary.id === "string" &&
    typeof summary.timestamp === "string" &&
    typeof summary.estado === "string" &&
    typeof summary.alertas === "number" &&
    typeof summary.invalidas === "number" &&
    (typeof summary.temperatura_c === "number" ||
      summary.temperatura_c === null) &&
    (typeof summary.humedad_pct === "number" ||
      summary.humedad_pct === null)
  );
}

function isAlertEvent(value: unknown): value is AlertEvent {
  if (!value || typeof value !== "object") return false;

  const alert = value as Record<string, unknown>;
  return (
    typeof alert.id === "string" &&
    typeof alert.timestamp === "string" &&
    (alert.estado === "alerta" || alert.estado === "invalida") &&
    Array.isArray(alert.motivos) &&
    alert.motivos.every((reason) => typeof reason === "string")
  );
}

function isAlertCounts(value: unknown): value is AlertCounts {
  if (!value || typeof value !== "object") return false;

  const counts = value as Record<string, unknown>;
  return (
    typeof counts.alertas === "number" &&
    typeof counts.invalidas === "number"
  );
}

function formatValue(value: number | null, unit: string) {
  if (value === null) return "—";

  return `${new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 1,
  }).format(value)}${unit}`;
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatChartTime(timestamp: string, range: "1h" | "24h" | "7d") {
  return new Intl.DateTimeFormat(
    "es-CL",
    range === "7d"
      ? { weekday: "short", day: "numeric", hour: "2-digit" }
      : { hour: "2-digit", minute: "2-digit" },
  ).format(new Date(timestamp));
}

function statusBadgeClass(status: string) {
  const stateClass =
    status === "alerta"
      ? styles.metricStatusAlert
      : status === "con_errores"
        ? styles.metricStatusError
        : "";

  return `${styles.metricStatus} ${stateClass}`;
}

function HistoryChart({
  title,
  unit,
  color,
  readings,
  range,
  min,
  max,
  id,
}: HistoryChartProps) {
  // Reduce los puntos del gráfico semanal para mantenerlo fluido sin cambiar el valor actual.
  const chartReadings =
    range === "7d" && readings.length > 168
      ? readings.filter((_, index) => index % Math.ceil(readings.length / 168) === 0)
      : readings;
  if (
    chartReadings.length > 0 &&
    chartReadings[chartReadings.length - 1].timestamp !==
      readings[readings.length - 1]?.timestamp
  ) {
    chartReadings.push(readings[readings.length - 1]);
  }
  const points = chartReadings
    .map((reading, index) => {
      const x =
        chartReadings.length === 1
          ? 320
          : 20 + (index * 600) / (chartReadings.length - 1);
      const y = 156 - ((reading.value - min) / (max - min)) * 132;
      return `${x},${y}`;
    })
    .join(" ");
  const labelIndexes = [
    ...new Set([
      0,
      Math.floor((chartReadings.length - 1) / 2),
      chartReadings.length - 1,
    ]),
  ];

  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div>
          <p className={styles.chartTitle}>{title}</p>
          <p className={styles.chartValue}>
            {readings.length
              ? formatValue(readings[readings.length - 1].value, unit)
              : `—${unit}`}
          </p>
        </div>
        <span className={styles.chartPeriod}>
          {range === "7d"
            ? "7 días"
            : range === "24h"
              ? "24 horas"
              : "1 hora"}
        </span>
      </div>
      <div className={styles.chartPlot}>
        {readings.length > 0 ? (
          <>
            <svg
              className={styles.chart}
              viewBox="0 0 640 180"
              role="img"
              aria-label={`${title} durante ${
                range === "7d"
                  ? "los últimos siete días"
                  : range === "24h"
                    ? "las últimas 24 horas"
                    : "la última hora"
              }`}
              preserveAspectRatio="none"
            >
              {[24, 68, 112, 156].map((y) => (
                <line
                  key={y}
                  x1="20"
                  y1={y}
                  x2="620"
                  y2={y}
                  className={styles.gridLine}
                />
              ))}
              {chartReadings.length > 1 ? (
                <polyline
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {chartReadings.map((reading, index) => {
                const x =
                  chartReadings.length === 1
                    ? 320
                    : 20 + (index * 600) / (chartReadings.length - 1);
                const y = 156 - ((reading.value - min) / (max - min)) * 132;

                return (
                  <circle
                    key={`${id}-${reading.timestamp}-${index}`}
                    cx={x}
                    cy={y}
                    r="4"
                    fill={color}
                    className={styles.chartPoint}
                  />
                );
              })}
            </svg>
            <div className={styles.timeLabels} aria-hidden="true">
              {labelIndexes.map((index) => (
                <span key={`${id}-${index}`}>
                  {formatChartTime(chartReadings[index].timestamp, range)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className={styles.chartEmpty}>Sin lecturas para mostrar.</p>
        )}
      </div>
    </article>
  );
}

export default function Home() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [alertCounts, setAlertCounts] = useState<AlertCounts>({
    alertas: 0,
    invalidas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [hasRecentData, setHasRecentData] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [range, setRange] = useState<"1h" | "24h" | "7d">("7d");

  useEffect(() => {
    let active = true;

    const updateSummaries = async () => {
      try {
        const response = await fetch(`/api/sensores?range=${range}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(
            `No se pudieron cargar las mediciones (HTTP ${response.status}).`,
          );
        }

        const result: unknown = await response.json();
        if (
          !result ||
          typeof result !== "object" ||
          !("summaries" in result) ||
          !Array.isArray(result.summaries) ||
          !result.summaries.every(isSummary) ||
          !("alerts" in result) ||
          !Array.isArray(result.alerts) ||
          !result.alerts.every(isAlertEvent) ||
          !("counts" in result) ||
          !isAlertCounts(result.counts)
        ) {
          throw new Error("La API devolvió un formato de datos inesperado.");
        }

        if (!active) return;

        const receivedSummaries = result.summaries;
        const latestTimestamp = receivedSummaries[0]
          ? Date.parse(receivedSummaries[0].timestamp)
          : Number.NaN;
        const age = Date.now() - latestTimestamp;

        setSummaries(receivedSummaries);
        setAlerts(result.alerts);
        setAlertCounts(result.counts);
        setHasRecentData(Number.isFinite(age) && age < 120_000 && age >= -60_000);
        setError(null);
        setLastChecked(new Date());
      } catch (loadError) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Ocurrió un error al cargar las mediciones.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void updateSummaries();
    const interval =
      range === "7d"
        ? null
        : window.setInterval(() => void updateSummaries(), 60_000);

    return () => {
      active = false;
      if (interval !== null) window.clearInterval(interval);
    };
  }, [range, reloadKey]);

  const latest = summaries[0];
  const temperatureReadings = summaries
    .filter(
      (summary): summary is Summary & { temperatura_c: number } =>
        summary.temperatura_c !== null,
    )
    .map((summary) => ({ timestamp: summary.timestamp, value: summary.temperatura_c }))
    .reverse();
  const humidityReadings = summaries
    .filter(
      (summary): summary is Summary & { humedad_pct: number } =>
        summary.humedad_pct !== null,
    )
    .map((summary) => ({ timestamp: summary.timestamp, value: summary.humedad_pct }))
    .reverse();

  return (
    <main className={styles.page}>
      {/* Navegación lateral y estado de la conexión con los datos del invernadero. */}
      <aside className={styles.sidebar}>
        <a
          className={styles.brand}
          href="#inicio"
          aria-label="Monitoreo de invernadero, inicio"
        >
          <span className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
          </span>
          <span>
            <strong>Invernadero</strong>
            <small>SISTEMA DE MONITOREO</small>
          </span>
        </a>

        <div className={styles.sidebarLabel}>MONITOREO</div>
        <a className={styles.navItem} href="#resumen" aria-current="page">
          <span className={styles.navIcon} aria-hidden="true">◫</span>
          Resumen
        </a>
        <a className={styles.navItem} href="#historial">
          <span className={styles.navIcon} aria-hidden="true">⌁</span>
          Historial
        </a>

        <div className={styles.sidebarFooter}>
          <span
            className={`${styles.connectionDot} ${
              hasRecentData ? styles.connectedDot : ""
            }`}
          />
          <span>
            <strong>
              {loading
                ? "Consultando datos"
                : hasRecentData
                  ? "Datos recientes"
                  : "Sin datos recientes"}
            </strong>
            <small>
              {latest
                ? `Última lectura: ${formatTime(latest.timestamp)}`
                : "Esperando primera lectura"}
            </small>
          </span>
        </div>
      </aside>

      <section className={styles.content} id="inicio">
        {/* Barra superior que muestra la fuente y la actualización más reciente. */}
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>MI ESPACIO</p>
            <p className={styles.breadcrumb}>
              Invernadero <span>/</span> Resumen
            </p>
          </div>
          <div className={styles.demoBadge}>
            <span
              className={`${styles.connectionDot} ${
                hasRecentData ? styles.connectedDot : ""
              }`}
            />
            {error
              ? "Error de conexión"
              : hasRecentData
                ? "Datos actualizados"
                : "Esperando datos"}
          </div>
        </header>

        <div className={styles.dashboard} id="resumen">
          {/* Encabezado del panel y controles de período y actualización. */}
          <section className={styles.pageHeading}>
            <div>
              <p className={styles.dateLabel}>PANEL DE CONTROL</p>
              <h1>Monitoreo del invernadero</h1>
              <p className={styles.subtitle}>
                Estado de las condiciones ambientales y tendencias registradas.
              </p>
            </div>
            <div className={styles.headingActions}>
              <label className={styles.rangeControl}>
                <span>Período</span>
                <select
                  className={styles.rangeSelect}
                  value={range}
                  onChange={(event) => {
                    setLoading(true);
                    setRange(event.target.value as "1h" | "24h" | "7d");
                  }}
                  aria-label="Período del historial"
                >
                  <option value="1h">Última hora</option>
                  <option value="24h">Últimas 24 horas</option>
                  <option value="7d">Últimos 7 días</option>
                </select>
              </label>
              <button
                className={styles.rangeBadge}
                type="button"
                onClick={() => {
                  setLoading(true);
                  setReloadKey((key) => key + 1);
                }}
                disabled={loading}
              >
                {loading ? "Actualizando…" : "Actualizar"}
              </button>
            </div>
          </section>

          {error ? (
            <div className={styles.errorNotice} role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setReloadKey((key) => key + 1);
                }}
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {/* Las tarjetas muestran el promedio del resumen más reciente guardado. */}
          <section className={styles.metrics} aria-label="Mediciones actuales">
            <article className={styles.metricCard}>
              <div className={styles.metricTop}>
                <span
                  className={`${styles.metricIcon} ${styles.temperatureIcon}`}
                  aria-hidden="true"
                >
                  °
                </span>
                <span className={styles.metricLabel}>TEMPERATURA</span>
                {latest ? (
                  <span className={statusBadgeClass(latest.estado)}>
                    {latest.estado === "alerta"
                      ? "Alerta"
                      : latest.estado === "con_errores"
                        ? "Con errores"
                        : "Resumen"}
                  </span>
                ) : null}
              </div>
              <p className={styles.metricValue}>
                {formatValue(latest?.temperatura_c ?? null, "°C")}
              </p>
              <p className={styles.metricNote}>
                {latest ? "Promedio del último resumen" : "Sin mediciones disponibles"}
              </p>
              <div className={`${styles.metricAccent} ${styles.temperatureAccent}`} />
            </article>

            <article className={styles.metricCard}>
              <div className={styles.metricTop}>
                <span
                  className={`${styles.metricIcon} ${styles.humidityIcon}`}
                  aria-hidden="true"
                >
                  %
                </span>
                <span className={styles.metricLabel}>HUMEDAD</span>
                {latest ? (
                  <span className={statusBadgeClass(latest.estado)}>
                    {latest.estado === "alerta"
                      ? "Alerta"
                      : latest.estado === "con_errores"
                        ? "Con errores"
                        : "Resumen"}
                  </span>
                ) : null}
              </div>
              <p className={styles.metricValue}>
                {formatValue(latest?.humedad_pct ?? null, "%")}
              </p>
              <p className={styles.metricNote}>
                {latest ? "Promedio del último resumen" : "Sin mediciones disponibles"}
              </p>
              <div className={`${styles.metricAccent} ${styles.humidityAccent}`} />
            </article>
          </section>

          {/* Conteo de alertas e incidencias recientes enviados por el procesador. */}
          <section className={styles.alertsSection} aria-labelledby="alerts-title">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.dateLabel}>ESTADO DEL SISTEMA</p>
                <h2 id="alerts-title">Alertas recientes</h2>
              </div>
              <span className={styles.sampleLabel}>
                {range === "1h"
                  ? "Última hora"
                  : range === "24h"
                    ? "Últimas 24 horas"
                    : "Últimos 7 días"}
              </span>
            </div>

            <div className={styles.alertSummary}>
              <article className={styles.alertCountCard}>
                <span className={`${styles.alertCountIcon} ${styles.warningIcon}`} aria-hidden="true">!</span>
                <span>
                  <strong>{alertCounts.alertas}</strong>
                  <small>Alertas ambientales</small>
                </span>
              </article>
              <article className={styles.alertCountCard}>
                <span className={`${styles.alertCountIcon} ${styles.errorIcon}`} aria-hidden="true">×</span>
                <span>
                  <strong>{alertCounts.invalidas}</strong>
                  <small>Lecturas inválidas</small>
                </span>
              </article>
            </div>

            {alerts.length > 0 ? (
              <ul className={styles.alertList}>
                {alerts.map((alert) => (
                  <li className={styles.alertItem} key={alert.id}>
                    <span
                      className={`${styles.alertMarker} ${
                        alert.estado === "alerta"
                          ? styles.warningMarker
                          : styles.errorMarker
                      }`}
                      aria-hidden="true"
                    />
                    <span className={styles.alertDescription}>
                      <strong>
                        {alert.estado === "alerta"
                          ? "Alerta ambiental"
                          : "Lectura inválida"}
                      </strong>
                      <small>
                        {alert.motivos.length
                          ? alert.motivos.join(" · ")
                          : "Sin detalle disponible"}
                      </small>
                    </span>
                    <time className={styles.alertTime} dateTime={alert.timestamp}>
                      {formatTime(alert.timestamp)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.noAlerts}>
                {loading
                  ? "Consultando alertas…"
                  : error
                    ? "No se pudieron consultar las alertas."
                    : "No hay alertas ni lecturas inválidas en los resúmenes recientes."}
              </p>
            )}
          </section>

          {/* Gráficos con las lecturas del período seleccionado. */}
          <section className={styles.historySection} id="historial">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.dateLabel}>TENDENCIA</p>
                <h2>
                  Historial de{" "}
                  {range === "1h"
                    ? "la última hora"
                    : range === "24h"
                      ? "las últimas 24 horas"
                      : "los últimos 7 días"}
                </h2>
              </div>
              <span className={styles.sampleLabel}>
                {lastChecked
                  ? `Consultado a las ${formatTime(lastChecked.toISOString())}`
                  : "Consultando Firestore"}
              </span>
            </div>
            <div className={styles.charts}>
              <HistoryChart
                id="temperatura"
                title="Temperatura"
                unit="°C"
                color="#a8e6a1"
                readings={temperatureReadings}
                range={range}
                min={18}
                max={30}
              />
              <HistoryChart
                id="humedad"
                title="Humedad"
                unit="%"
                color="#84c9f4"
                readings={humidityReadings}
                range={range}
                min={40}
                max={80}
              />
            </div>
          </section>

          {/* El panel consulta lecturas periódicamente; el dispositivo sigue escribiendo con token. */}
          <footer className={styles.footer}>
            <span>Invernadero IoT</span>
            <span>
              {range === "7d"
                ? "Período semanal: actualiza manualmente para consultar de nuevo."
                : "Actualización automática cada minuto."}
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}