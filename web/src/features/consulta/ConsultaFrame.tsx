"use client";

import type { ReactNode } from "react";
import PanelShell from "@/components/layout/PanelShell";
import { useConsultaPanel } from "./ConsultaContext";
import { nombreAlerta } from "./components/ConsultaWidgets";

export default function ConsultaFrame({children}:{children:ReactNode}) {
  const {datos, error, cargando, estadoDato, recientes} = useConsultaPanel();
  const notificaciones = datos.alerts.slice(0, 5).map(a => ({
    id: a.id,
    title: nombreAlerta(a),
    description: a.motivos.join(" · ") || "Evento registrado por el sistema",
    timestamp: a.timestamp,
    severity: a.estado,
  }));
  return <PanelShell
    role="consulta"
    label={estadoDato}
    connected={!error && recientes}
    count={datos.alerts.length}
    notifications={notificaciones}
    notificationStatus={cargando ? "loading" : error ? "unavailable" : "ready"}
  >{children}</PanelShell>;
}
