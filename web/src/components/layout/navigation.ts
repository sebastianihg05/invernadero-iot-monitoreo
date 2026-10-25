import type { IconName } from "@/components/ui/Icon";

export type PanelRole = "consulta" | "admin";
export type NavItem = { title: string; href: string; icon: IconName };

export const consultaLinks: NavItem[] = [
  { title: "Inicio", href: "/consulta", icon: "home" },
  { title: "Historial", href: "/consulta/historial", icon: "history" },
  { title: "Reportes", href: "/consulta/reportes", icon: "document" },
  { title: "Alertas", href: "/consulta/alertas", icon: "bell" },
];

export const adminLinks: NavItem[] = [
  { title: "Métricas", href: "/admin", icon: "gauge" },
  { title: "Sensores", href: "/admin/sensores", icon: "activity" },
  { title: "Dispositivos", href: "/admin/dispositivos", icon: "sliders" },
  { title: "Alertas", href: "/admin/alertas", icon: "bell" },
  { title: "Usuarios", href: "/admin/usuarios", icon: "users" },
  { title: "Configuración", href: "/admin/configuracion", icon: "settings" },
];

export const consultaPages: Record<string, { title: string; subtitle: string }> = {
  "/consulta": { title: "Monitoreo General", subtitle: "Vista operativa de variables ambientales" },
  "/consulta/historial": { title: "Historial y Exportación", subtitle: "Consulta y descarga de registros históricos" },
  "/consulta/reportes": { title: "Reportes Periódicos", subtitle: "Informes diarios, semanales y mensuales" },
  "/consulta/alertas": { title: "Centro de Alertas", subtitle: "Historial y estado de alertas del sistema" },
};

export const adminPages: Record<string, { title: string; subtitle: string }> = {
  "/admin": { title: "Panel de Métricas", subtitle: "Estado general del sistema y servicios" },
  "/admin/sensores": { title: "Gestión de Sensores", subtitle: "Calibración, rangos y estado de sensores" },
  "/admin/dispositivos": { title: "Gestión de Dispositivos", subtitle: "Nodos Raspberry Pi, tokens y estado de conexión" },
  "/admin/alertas": { title: "Reglas de Alertas", subtitle: "Configuración de umbrales y notificaciones" },
  "/admin/usuarios": { title: "Control de Acceso", subtitle: "Gestión de usuarios y permisos" },
  "/admin/configuracion": { title: "Configuración del Sistema", subtitle: "Parámetros globales y mantenimiento" },
};