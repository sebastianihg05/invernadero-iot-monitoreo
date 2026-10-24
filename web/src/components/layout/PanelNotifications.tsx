"use client";

import Link from "next/link";
import { useId } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./panelLayout.module.css";

export type PanelNotification = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: "alerta" | "invalida";
};

export type NotificationStatus = "loading" | "unavailable" | "ready";

function formatoFecha(timestamp: string): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

/**
 * El checkbox nativo permite abrir y cerrar notificaciones sin estado React.
 * La campana, la X y el fondo pueden cerrar el panel.
 * Se presentan solamente eventos devueltos por la API.
 */
export default function PanelNotifications({ items, status, count, alertsHref, pathname }: {
  items: PanelNotification[];
  status: NotificationStatus;
  count: number;
  alertsHref: string;
  pathname: string;
}) {
  const notificacionId = useId();
  return (
    <div key={pathname} className={styles.notificationCenter}>
      <input
        id={notificacionId}
        type="checkbox"
        className={styles.notificationToggle}
        aria-label="Abrir o cerrar notificaciones"
      />
      <label htmlFor={notificacionId} className={styles.bellButton} title="Abrir o cerrar notificaciones">
        <Icon name="bell" size={20}/>
        {count > 0 && <span className={styles.notificationCount}>{count > 99 ? "99+" : count}</span>}
      </label>
      <label htmlFor={notificacionId} className={styles.notificationBackdrop} aria-label="Cerrar notificaciones" />
      <section className={styles.notificationPanel} aria-label="Notificaciones recientes">
        <div className={styles.notificationHeading}>
          <div className={styles.notificationHeadingText}>
            <strong>Notificaciones</strong>
            <span>Últimas alertas registradas</span>
          </div>
          <label htmlFor={notificacionId} className={styles.notificationClose} aria-label="Cerrar notificaciones" title="Cerrar notificaciones">
            <Icon name="close" size={18}/>
          </label>
        </div>
        <div className={styles.notificationList}>
          {status === "loading" ? (
            <p className={styles.notificationEmpty} role="status">Consultando notificaciones…</p>
          ) : status === "unavailable" ? (
            <p className={styles.notificationEmpty} role="status">No fue posible consultar las notificaciones. Revisa la conexión con la API.</p>
          ) : items.length === 0 ? (
            <p className={styles.notificationEmpty}>No hay notificaciones registradas.</p>
          ) : items.slice(0, 5).map(item => (
            <Link href={alertsHref} className={styles.notificationItem} key={item.id}>
              <span className={`${styles.notificationBullet} ${item.severity === "invalida" ? styles.notificationInvalid : styles.notificationAlert}`} />
              <span className={styles.notificationInfo}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
                <small>{formatoFecha(item.timestamp)}</small>
              </span>
            </Link>
          ))}
        </div>
        <Link className={styles.notificationAll} href={alertsHref}>
          Ver todas las alertas <Icon name="arrow" size={16}/>
        </Link>
      </section>
    </div>
  );
}
