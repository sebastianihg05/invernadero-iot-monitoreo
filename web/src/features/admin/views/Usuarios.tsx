"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import styles from "../admin.module.css";

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        const listaUsuarios = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Usuario[];
        setUsuarios(listaUsuarios);
      } catch (err: any) {
        console.error("Error al obtener usuarios:", err);
        setError(err.message || "Error al conectar con la base de datos");
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  if (error) {
    return (
      <div style={{ padding: "20px", color: "#ff6b6b", backgroundColor: "rgba(255,0,0,0.1)", borderRadius: "8px" }}>
        <h3>Algo falló al cargar los usuarios:</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <section aria-label="Gestión de usuarios" style={{ width: "100%", marginTop: "24px" }}>
      <div className={styles.tableContainer} style={{ border: "1px solid #1a3c34", borderRadius: "12px", background: "#0c1f1a", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#a0c2b5" }}>
            <p>Cargando usuarios desde la base de datos...</p>
          </div>
        ) : (
          <table className={styles.usersTable} style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                <th style={{ padding: "16px", borderBottom: "1px solid #1a3c34", color: "#a0c2b5", backgroundColor: "#122c25", fontSize: "13px", textTransform: "uppercase" }}>Nombre</th>
                <th style={{ padding: "16px", borderBottom: "1px solid #1a3c34", color: "#a0c2b5", backgroundColor: "#122c25", fontSize: "13px", textTransform: "uppercase" }}>Correo</th>
                <th style={{ padding: "16px", borderBottom: "1px solid #1a3c34", color: "#a0c2b5", backgroundColor: "#122c25", fontSize: "13px", textTransform: "uppercase" }}>Rol</th>
                <th style={{ padding: "16px", borderBottom: "1px solid #1a3c34", color: "#a0c2b5", backgroundColor: "#122c25", fontSize: "13px", textTransform: "uppercase" }}>ID</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #1a3c34", transition: "background-color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#102721'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: "16px", color: "#d9f1e8", fontSize: "14px", fontWeight: "500" }}>
                    {user.nombre || "Sin nombre"}
                  </td>
                  <td style={{ padding: "16px", color: "#d9f1e8", fontSize: "14px" }}>{user.correo}</td>
                  <td style={{ padding: "16px" }}>
                    <span 
                      className={user.rol === 'admin' ? styles.roleAdmin : styles.roleUser}
                      style={{ 
                        padding: "4px 10px", 
                        borderRadius: "20px", 
                        fontSize: "12px", 
                        fontWeight: "bold",
                        textTransform: "capitalize",
                        backgroundColor: user.rol === 'admin' ? "rgba(46, 204, 113, 0.15)" : "rgba(52, 152, 219, 0.15)",
                        color: user.rol === 'admin' ? "#2ecc71" : "#3498db",
                        border: `1px solid ${user.rol === 'admin' ? "rgba(46, 204, 113, 0.3)" : "rgba(52, 152, 219, 0.3)"}`
                      }}
                    >
                      {user.rol || "usuario"}
                    </span>
                  </td>
                  <td style={{ padding: "16px", fontFamily: "monospace", fontSize: "12px", color: "#87a599" }}>
                    {user.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}