"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import styles from "./panelLayout.module.css";
import { adminLinks, consultaLinks, type PanelRole } from "./navigation";

export default function PanelSidebar({ role, onNavigate, alertCount, menuId }: {
  role: PanelRole;
  onNavigate: () => void;
  alertCount: number;
  menuId: string;
}) {
  const pathname = usePathname();
  const links = role === "admin" ? adminLinks : consultaLinks;
  return (
    <aside id="panel-sidebar" className={styles.sidebar} aria-label={role === "admin" ? "Navegación de administración" : "Navegación de consulta"}>
      <div className={styles.brand}>
        <Icon name="leaf" size={43}/>
        <div><strong>Invernadero IoT</strong><small>Monitoreo Inteligente</small></div>
        <label htmlFor={menuId} className={styles.mobileClose} aria-label="Cerrar navegación móvil" title="Cerrar menú">
          <Icon name="close" size={22}/>
        </label>
      </div>
      {role === "admin" && <p className={styles.roleLabel}>PANEL ADMINISTRATIVO</p>}
      <nav className={styles.nav} aria-label="Secciones del panel">
        {links.map(item => (
          <Link key={item.href} href={item.href} onClick={onNavigate}
            className={`${styles.navLink} ${pathname === item.href ? styles.navActive : ""}`}
            aria-current={pathname === item.href ? "page" : undefined}>
            <Icon name={item.icon} size={21}/>
            <span>{item.title}</span>
            {item.title === "Alertas" && alertCount > 0 && <span className={styles.navCount}>{alertCount}</span>}
          </Link>
        ))}
      </nav>
      {role === "admin" && (
        <div className={styles.sidebarFoot}>
          <Icon name="shield" size={18}/>
          <span><strong>Administrador</strong><small>Interfaz de administración</small></span>
        </div>
      )}
    </aside>
  );
}
