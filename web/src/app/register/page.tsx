"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebaseClient';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Estados para mostrar/ocultar contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.correo.endsWith('@unab.cl') && !formData.correo.endsWith('@uandresbello.edu')) {
      alert("El correo debe ser institucional (@unab.cl o @uandresbello.edu)");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }


    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.correo, formData.password);
      const user = userCredential.user;

      await setDoc(doc(db, "usuarios", user.uid), {
        nombre: formData.nombre,
        correo: formData.correo,
        rol: "estudiante",
        fechaRegistro: serverTimestamp()
      });

      alert("Registro exitoso. Redirigiendo al inicio de sesión...");
      router.push('/');
    } catch (error: any) {
      console.error("Error en el registro:", error);
      if (error.code === 'auth/email-already-in-use') {
        alert("Este correo ya está registrado.");
      } else if (error.code === 'auth/weak-password') {
        alert("La contraseña debe tener al menos 6 caracteres.");
      } else {
        alert("Ocurrió un error al registrar la cuenta.");
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
          <h2 className={styles.heading}>Crear cuenta</h2>
          <p className={styles.description}>
            Completa tus datos para solicitar acceso a la plataforma.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleRegister}>
          <div className={styles.inputGroup}>
            <label>Nombre completo</label>
            <div className={styles.inputWrapper}>
              <img src="/usuario.png" alt="Usuario" className={styles.iconImage} />
              <input 
                type="text" 
                name="nombre"
                placeholder="Tu nombre completo" 
                value={formData.nombre}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Correo institucional</label>
            <div className={styles.inputWrapper}>
              <img src="/correo.png" alt="Correo" className={styles.iconImage} />
              <input 
                type="email" 
                name="correo"
                placeholder="tu.correo@unab.cl" 
                value={formData.correo}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <span className={styles.helperText}>Debe ser un correo @uandresbello.edu o @unab.cl</span>
          </div>

          <div className={styles.inputGroup}>
            <label>Contraseña</label>
            <div className={styles.inputWrapper}>
              <img src="/candado.png" alt="Candado" className={styles.iconImage} />
              <input 
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Crea una contraseña" 
                value={formData.password}
                onChange={handleChange}
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

          <div className={styles.inputGroup}>
            <label>Confirmar contraseña</label>
            <div className={styles.inputWrapper}>
              <img src="/candado.png" alt="Candado" className={styles.iconImage} />
              <input 
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirma tu contraseña" 
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <img 
                src="/ojo.png" 
                alt="Ver" 
                className={styles.iconImage} 
                style={{ cursor: 'pointer', opacity: showConfirmPassword ? 1 : 0.5 }}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </div>
          </div>

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            <img src="/usuario.png" alt="Registrar" className={styles.btnIcon} /> 
            {loading ? "Registrando..." : "Solicitar registro"}
          </button>
        </form>

        <p className={styles.footerText}>
          ¿Ya tienes una cuenta? <Link href="/" className={styles.link}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
