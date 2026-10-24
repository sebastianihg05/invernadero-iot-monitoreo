import type { IconName } from "@/components/ui/Icon";

export type PanelRole = "consulta" | "admin";
export type NavItem = { title: string; href: string; icon: IconName };

export const adminLinks: NavItem[] = [
  { title: "Inicio", href: "/admin", icon: "house" },
  { title: "Sensores", href: "/admin/sensores", icon: "sensor" },
  { title: "Alertas", href: "/admin/alertas", icon: "bell" },
  { title: "Configuración", href: "/admin/configuracion", icon: "settings" },
  { title: "Buzzer", href: "/admin/buzzer", icon: "speaker" },
  { title: "Usuarios", href: "/admin/usuarios", icon: "users" },
  { title: "Historial", href: "/admin/historial", icon: "history" },
];

export const consultaLinks: NavItem[] = [
  { title: "Inicio", href: "/consulta", icon: "house" },
  { title: "Historial", href: "/consulta/historial", icon: "chart" },
  { title: "Alertas", href: "/consulta/alertas", icon: "bell" },
];

export const adminPages: Record<string, { title: string; description: string }> = {
  "/admin": { title: "Panel de administración del invernadero", description: "Monitoreo y control general de las condiciones ambientales" },
  "/admin/sensores": { title: "Sensores del invernadero", description: "Estado del DHT22, la Raspberry Pi y los componentes conectados" },
  "/admin/alertas": { title: "Alertas del invernadero", description: "Notificaciones y anomalías registradas en el invernadero" },
  "/admin/configuracion": { title: "Configuración del invernadero", description: "Umbrales, frecuencia de medición y parámetros operativos" },
  "/admin/buzzer": { title: "Control del buzzer", description: "Estado y futura gestión del buzzer KY-006" },
  "/admin/usuarios": { title: "Usuarios del sistema", description: "Administración de usuarios (pendiente de implementación)" },
  "/admin/historial": { title: "Historial del sistema", description: "Registro histórico de mediciones y eventos disponibles" },
};
export const consultaPages: Record<string, { title: string; description: string }> = {
  "/consulta": { title: "Panel de consulta del invernadero", description: "Monitoreo en tiempo real de las condiciones ambientales" },
  "/consulta/historial": { title: "Historial del invernadero", description: "Consulta el registro histórico de las condiciones ambientales" },
  "/consulta/alertas": { title: "Alertas del invernadero", description: "Visualiza las notificaciones y anomalías detectadas en el sistema" },
};
