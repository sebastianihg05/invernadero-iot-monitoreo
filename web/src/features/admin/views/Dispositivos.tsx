"use client";

import { useEffect, useState, type FormEvent } from "react";
import styles from "../admin.module.css";
import { Icon } from "../components/AdminWidgets";
import { fetchConSesion } from "@/lib/sesionCliente";

type Dispositivo = { id: string; nombre: string; activo: boolean; enLinea: boolean; lastSeenAt: string | null };

export default function Dispositivos() {
  const [lista, setLista] = useState<Dispositivo[]>([]);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [id, setId] = useState("");
  const [nombre, setNombre] = useState("");

  async function cargar() {
    const res = await fetchConSesion("/api/dispositivos");
    const datos = await res.json();
    if (!res.ok) return setError(datos.error);
    setLista(datos.dispositivos);
  }

  useEffect(() => {
    cargar().catch(() => setError("No se pudieron cargar los dispositivos."));
  }, []);

  async function registrar(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetchConSesion("/api/dispositivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nombre }),
    });
    const datos = await res.json();
    if (!res.ok) return setError(datos.error);

    setToken(datos.token);
    setId("");
    setNombre("");
    cargar();
  }

  async function cambiar(d: Dispositivo) {
    await fetchConSesion("/api/dispositivos/" + d.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: d.activo ? "revocar" : "reactivar" }),
    });
    cargar();
  }

  return <>
    <section className={styles.panel}>
      <div className={styles.panelTitle}><Icon name="power"/><h3>Registrar dispositivo</h3></div>
      <form onSubmit={registrar}>
        <div className={styles.formPair}>
          <label>Identificador<input value={id} onChange={e => setId(e.target.value)} placeholder="invernadero-01" required/></label>
          <label>Nombre<input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Invernadero principal" required/></label>
        </div>
        <div className={styles.formActions}><button type="submit" className={styles.primaryButton}>Registrar</button></div>
      </form>
      {error && <p className={styles.formError}>{error}</p>}
    </section>

    {token && <div className={styles.warningBox}>
      <div>
        <strong>Copia este token ahora, no se vuelve a mostrar.</strong>
        <p>Ponlo en el .env de la Raspberry como DEVICE_TOKEN.</p>
        <code style={{ wordBreak: "break-all" }}>{token}</code>
        <p><button type="button" className={styles.secondaryButton} onClick={() => setToken("")}>Ya lo guardé</button></p>
      </div>
    </div>}

    <section className={styles.panel}>
      <div className={styles.panelTitle}><Icon name="sensor"/><h3>Dispositivos registrados</h3></div>
      <div className={styles.tableScroll}><table className={styles.dataTable}>
        <thead><tr><th>Dispositivo</th><th>Estado</th><th>Última conexión</th><th></th></tr></thead>
        <tbody>
          {lista.map(d => <tr key={d.id}>
            <td><strong>{d.nombre}</strong><br/><small>{d.id}</small></td>
            <td>{!d.activo ? "Revocado" : d.enLinea ? "En línea" : "Sin conexión"}</td>
            <td>{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString("es-CL") : "Nunca"}</td>
            <td><button type="button" className={styles.secondaryButton} onClick={() => cambiar(d)}>{d.activo ? "Revocar" : "Reactivar"}</button></td>
          </tr>)}
          {lista.length === 0 && <tr><td colSpan={4} className={styles.emptyTable}>No hay dispositivos registrados.</td></tr>}
        </tbody>
      </table></div>
    </section>
  </>;
}
