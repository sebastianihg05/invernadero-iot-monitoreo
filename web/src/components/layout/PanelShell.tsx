"use client";

import { useId, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import PanelHeader from "./PanelHeader";
import PanelSidebar from "./PanelSidebar";
import styles from "./panelLayout.module.css";
import type { PanelRole } from "./navigation";
import type { PanelNotification, NotificationStatus } from "./PanelNotifications";

/**
 * Una única casilla HTML controla ambas variantes sin estado React:
 * - escritorio: desmarcada = barra visible, marcada = barra oculta;
 * - móvil: desmarcada = cajón cerrado, marcada = cajón abierto.
 * El contenido se expande al ocultar la barra en escritorio.
 */
export default function PanelShell({ role, label, connected, count, notifications, notificationStatus, children }: {
  role: PanelRole;
  label: string;
  connected: boolean;
  count: number;
  notifications: PanelNotification[];
  notificationStatus: NotificationStatus;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const menuRef = useRef<HTMLInputElement>(null);

  const cerrarAlNavegar = () => {
    if (menuRef.current) menuRef.current.checked = false;
  };

  return (
    <main className={styles.shell} data-panel-role={role}>
      {/* La clave de la ruta restablece el menú cuando cambia la página. */}
      <input
        key={pathname}
        ref={menuRef}
        type="checkbox"
        className={styles.mobileToggle}
        id={menuId}
        aria-label="Mostrar u ocultar el menú lateral"
      />
      <PanelSidebar role={role} onNavigate={cerrarAlNavegar} alertCount={count} menuId={menuId} />
      <label htmlFor={menuId} className={styles.backdrop} aria-label="Cerrar navegación móvil" />
      <div className={styles.content}>
        <PanelHeader
          role={role}
          pathname={pathname}
          menuId={menuId}
          label={label}
          connected={connected}
          count={count}
          notifications={notifications}
          notificationStatus={notificationStatus}
        />
        <div className={styles.pageBody}>{children}</div>
      </div>
    </main>
  );
}
