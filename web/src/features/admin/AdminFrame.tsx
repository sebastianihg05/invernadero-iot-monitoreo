"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import PanelShell from "@/components/layout/PanelShell";
import { Icon, tituloAlerta } from "./components/AdminWidgets";
import { useAdminPanel } from "./AdminContext";
import styles from "./admin.module.css";

export default function AdminFrame({children}: {children: ReactNode}) {
  const { conexion, pendientes, alertas, error, cargando, consultar, setCargando } = useAdminPanel();
  const pathname = usePathname();
  const notificaciones = alertas.slice(0, 5).map(a => ({
    id: a.id,
    title: tituloAlerta(a),
    description: a.motivos.join(" · ") || "Evento registrado por el sistema",
    timestamp: a.timestamp,
    severity: a.estado,
  }));
  return <PanelShell
    role="admin"
    connected={conexion === "reciente"}
    label={conexion === "reciente" ? "Lecturas recientes" : "Estado no confirmado"}
    count={pendientes}
    notifications={notificaciones}
    notificationStatus={cargando ? "loading" : error ? "unavailable" : "ready"}
  >
    {pathname !== "/admin/usuarios" && pathname !== "/admin/dispositivos" && error && <div className={styles.apiNotice} role="status"><Icon name="info" size={18}/><div><strong>Datos reales no disponibles.</strong> {error} No se muestran mediciones inventadas.</div><button type="button" className={styles.secondaryButton} disabled={cargando} onClick={() => {setCargando(true);void consultar();}}><Icon name="refresh" size={15}/>Reintentar</button></div>}
    {children}
  </PanelShell>;
}
