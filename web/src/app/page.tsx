"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '../lib/firebaseClient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Autenticar credenciales en Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Buscar el documento del usuario en Firestore para leer su rol
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const rol = userData.rol;

        // 3. Redirigir dinámicamente según el rol
        if (rol === 'admin') {
          router.push('/admin');
        } else {
          router.push('/consulta');
        }
      } else {
        alert("Error: El usuario está autenticado pero no tiene perfil en la base de datos.");
        auth.signOut();
      }
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        alert("Correo o contraseña incorrectos.");
      } else {
        alert("Ocurrió un error al intentar iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <img src="/hoja.png" alt="Logo Invernadero" className={styles.logoIcon} />
          </div>
          <div>
            <h1 className={styles.title}>Invernadero IoT</h1>
            <p className={styles.subtitle}>Monitoreo Inteligente</p>
          </div>
        </div>

        <div className={styles.headingGroup}>
          <h2 className={styles.heading}>Inicia sesión</h2>
          <p className={styles.description}>
            Accede a la plataforma para consultar el estado de tus cultivos.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputGroup}>
            <label>Correo electrónico</label>
            <div className={styles.inputWrapper}>
              <img src="/correo.png" alt="Correo" className={styles.iconImage} />
              <input 
                type="email" 
                placeholder="tu.correo@unab.cl" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Contraseña</label>
            <div className={styles.inputWrapper}>
              <img src="/candado.png" alt="Candado" className={styles.iconImage} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Ingresa tu contraseña" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <img 
                src="/ojo.png" 
                alt="Ver" 
                className={styles.iconImage} 
                style={{ cursor: 'pointer', opacity: showPassword ? 1 : 0.5 }} 
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>

          <div className={styles.options}>
            <label className={styles.checkbox}>
              <input type="checkbox" disabled={loading} />
              <span className={styles.checkmark}></span>
              Recordarme
            </label>
            <Link href="#" className={styles.link}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            <img src="/flecha.png" alt="Entrar" className={styles.btnIcon} /> 
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <p className={styles.footerText}>
          ¿No tienes una cuenta? <Link href="/register" className={styles.link}>Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}