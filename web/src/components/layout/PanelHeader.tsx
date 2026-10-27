"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { adminPages, consultaPages, type PanelRole } from "./navigation";
import PanelNotifications, { type PanelNotification, type NotificationStatus } from "./PanelNotifications";
import styles from "./panelLayout.module.css";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const meta = (role === "admin" ? adminPages : consultaPages)[pathname];
  const alertsHref = role === "admin" ? "/admin/alertas" : "/consulta/alertas";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "usuarios", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserName(userDocSnap.data().nombre);
          } else {
            setUserName("Usuario");
          }
        } catch (error) {
          console.error("Error al obtener nombre:", error);
          setUserName("Usuario");
        }
      } else {
        setUserName(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <header className={styles.header}>
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
        
        <div className={styles.dropdownContainer}>
          <div 
            className={`${styles.userPill} ${styles.userPillInteractive}`} 
            onClick={() => setShowMenu(!showMenu)}
          >
            <span className={styles.avatar}><Icon name="users" size={18}/></span>
            <span>{userName ? userName : "Cargando..."}</span>
          </div>

          {showMenu && (
            <div className={styles.dropdownMenu}>
              <button onClick={handleLogout} className={styles.logoutButton}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}