"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "../admin.module.css";
import { Icon } from "@/components/ui/Icon";

interface DeviceItem {
  id: string;
  nombre: string;
  activo: boolean;
  config: {
    intervaloMuestreoSeg: number;
    intervaloEnvioSeg: number;
    umbrales: {
      tempMax: number;
      tempMin: number;
      humedadMin: number;
    };
  };
  isOnline: boolean;
  lastSeenAt: string | null;
}

export default function Dispositivos() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tokenCreado, setTokenCreado] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: "",
    nombre: "",
    intervaloMuestreoSeg: 10,
    intervaloEnvioSeg: 60,
    tempMax: 28,
    tempMin: 15,
    humedadMin: 40,
  });

  const consultarDispositivos = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/dispositivos", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar dispositivos");
      setDevices(json.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void consultarDispositivos();
    const interval = setInterval(() => void consultarDispositivos(), 30_000);
    return () => clearInterval(interval);
  }, [consultarDispositivos]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/dispositivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          nombre: form.nombre,
          config: {
            intervaloMuestreoSeg: Number(form.intervaloMuestreoSeg),
            intervaloEnvioSeg: Number(form.intervaloEnvioSeg),
            tempMax: Number(form.tempMax),
            tempMin: Number(form.tempMin),
            humedadMin: Number(form.humedadMin),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear dispositivo");

      setTokenCreado(json.data.rawToken);
      await consultarDispositivos();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al registrar");
    }
  };

  const handleAccion = async (id: string, accion: "revocar" | "reactivar") => {
    const confirmacion = window.confirm(
      accion === "revocar"
        ? `¿Estás seguro de revocar el acceso a ${id}?`
        : `¿Reactivar el nodo ${id}?`
    );
    if (!confirmacion) return;

    try {
      const res = await fetch(`/api/dispositivos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await consultarDispositivos();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--ink)" }}>
            Nodos Raspberry Pi
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
            Monitoreo en tiempo real, aprovisionamiento y tokens criptográficos.
          </p>
        </div>
        <button
          className={styles.primaryButton}
          onClick={() => {
            setTokenCreado(null);
            setModalAbierto(true);
          }}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Icon name="sliders" size={16} /> Registrar Nodo
        </button>
      </div>

      {error && <div className={styles.apiNotice}>{error}</div>}

      {/* Grid de Dispositivos */}
      {cargando && devices.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>Cargando dispositivos...</p>
      ) : devices.length === 0 ? (
        <div className={styles.panel} style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ color: "var(--muted)" }}>No hay dispositivos registrados.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {devices.map((dev) => (
            <div key={dev.id} className={styles.panel} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--ink)" }}>{dev.nombre}</h3>
                  <code style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{dev.id}</code>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: dev.isOnline ? "rgba(83,236,155,0.15)" : "rgba(153,173,182,0.15)",
                      color: dev.isOnline ? "#53ec9b" : "#99adb6",
                      border: `1px solid ${dev.isOnline ? "#53ec9b" : "#99adb6"}`,
                    }}
                  >
                    {dev.isOnline ? "En Línea" : "Desconectado"}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: dev.activo ? "rgba(67,187,255,0.15)" : "rgba(255,100,100,0.15)",
                      color: dev.activo ? "#43bbff" : "#ff6464",
                    }}
                  >
                    {dev.activo ? "Activo" : "Revocado"}
                  </span>
                </div>
              </div>

              {/* Configuración del nodo */}
              <div
                style={{
                  background: "rgba(0,0,0,0.25)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <span style={{ color: "var(--muted)" }}>Muestreo:</span> {dev.config?.intervaloMuestreoSeg}s
                </div>
                <div>
                  <span style={{ color: "var(--muted)" }}>Envío:</span> {dev.config?.intervaloEnvioSeg}s
                </div>
                <div>
                  <span style={{ color: "var(--muted)" }}>Temp:</span> {dev.config?.umbrales?.tempMin}°C - {dev.config?.umbrales?.tempMax}°C
                </div>
                <div>
                  <span style={{ color: "var(--muted)" }}>Hum. Mín:</span> {dev.config?.umbrales?.humedadMin}%
                </div>
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                Último contacto: {dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleString() : "Nunca"}
              </div>

              {/* Botones de acción */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                {dev.activo ? (
                  <button
                    className={styles.secondaryButton}
                    onClick={() => handleAccion(dev.id, "revocar")}
                    style={{ flex: 1, borderColor: "rgba(255,100,100,0.4)", color: "#ff6464" }}
                  >
                    Revocar Token
                  </button>
                ) : (
                  <button
                    className={styles.secondaryButton}
                    onClick={() => handleAccion(dev.id, "reactivar")}
                    style={{ flex: 1, borderColor: "rgba(83,236,155,0.4)", color: "#53ec9b" }}
                  >
                    Reactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Dispositivo */}
      {modalAbierto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div className={styles.panel} style={{ width: "100%", maxWidth: "500px", margin: "1rem" }}>
            <h3 style={{ margin: "0 0 1rem", color: "var(--ink)" }}>Registrar Nuevo Nodo</h3>

            {tokenCreado ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div
                  style={{
                    padding: "1rem",
                    background: "rgba(83,236,155,0.1)",
                    border: "1px solid #53ec9b",
                    borderRadius: "8px",
                  }}
                >
                  <p style={{ margin: "0 0 0.5rem", color: "#53ec9b", fontWeight: 600 }}>
                    ¡Token generado con éxito!
                  </p>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                    Copia este token ahora. Por seguridad, solo se guarda su hash SHA-256 y no podrás volver a verlo:
                  </p>
                  <pre
                    style={{
                      background: "rgba(0,0,0,0.5)",
                      padding: "8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      overflowX: "auto",
                      color: "#53ec9b",
                    }}
                  >
                    {tokenCreado}
                  </pre>
                </div>
                <button
                  className={styles.primaryButton}
                  onClick={() => {
                    setModalAbierto(false);
                    setTokenCreado(null);
                  }}
                >
                  Entendido, ya lo copié
                </button>
              </div>
            ) : (
              <form onSubmit={handleCrear} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>ID Dispositivo (único):</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: invernadero-01"
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--line)",
                      color: "var(--ink)",
                      borderRadius: "6px",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Nombre / Ubicación:</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Sector Tomates - Nave A"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--line)",
                      color: "var(--ink)",
                      borderRadius: "6px",
                    }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Muestreo (seg):</label>
                    <input
                      type="number"
                      value={form.intervaloMuestreoSeg}
                      onChange={(e) => setForm({ ...form, intervaloMuestreoSeg: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        padding: "8px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                        borderRadius: "6px",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Envío (seg):</label>
                    <input
                      type="number"
                      value={form.intervaloEnvioSeg}
                      onChange={(e) => setForm({ ...form, intervaloEnvioSeg: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        padding: "8px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                        borderRadius: "6px",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setModalAbierto(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className={styles.primaryButton}>
                    Generar Token y Guardar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}