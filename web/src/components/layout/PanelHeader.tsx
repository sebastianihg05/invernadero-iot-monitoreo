"use client";

import { Icon } from "@/components/ui/Icon";
import { adminPages, consultaPages, type PanelRole } from "./navigation";
import PanelNotifications, { type PanelNotification, type NotificationStatus } from "./PanelNotifications";
import styles from "./panelLayout.module.css";

export default function PanelHeader({ role, pathname, menuId, label, connected, count, notifications, notificationStatus }: {
  role: PanelRole;
  pathname: string;
  menuId: string;
  label: string;
  connected: boolean;
  count: number;
  notifications: PanelNotification[];
  notificationStatus: NotificationStatus;
}) {
  const meta = (role === "admin" ? adminPages : consultaPages)[pathname];
  const alertsHref = role === "admin" ? "/admin/alertas" : "/consulta/alertas";
  return (
    <header className={styles.header}>
      {/* Etiqueta nativa: escritorio pliega la barra; móvil abre el cajón. */}
      <label htmlFor={menuId} className={styles.menuButton} title="Mostrar u ocultar barra lateral" aria-label="Mostrar u ocultar barra lateral">
        <Icon name="menu" size={23}/>
      </label>
      <div className={styles.heading}>
        <h1>{meta?.title ?? "Invernadero IoT"}</h1>
        <p>{meta?.description ?? "Monitoreo del invernadero"}</p>
      </div>
      <span className={`${styles.status} ${connected ? styles.statusConnected : styles.statusUnknown}`}>
        <span className={styles.statusDot}/>{label}
      </span>
      <div className={styles.headerActions}>
        <PanelNotifications
          pathname={pathname}
          items={notifications}
          status={notificationStatus}
          count={count}
          alertsHref={alertsHref}
        />
        <div className={styles.userPill}>
          <span className={styles.avatar}><Icon name="users" size={18}/></span>
          <span>{role === "admin" ? "Administrador" : "Usuario de consulta"}</span>
        </div>
      </div>
    </header>
  );
}
