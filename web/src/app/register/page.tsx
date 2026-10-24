"use client";

import { useState } from 'react';
import Link from 'next/link';
import styles from './register.module.css';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    password: '',
    confirmPassword: '',
    aceptaTerminos: false
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
    
    if (formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    if (!formData.aceptaTerminos) {
      alert("Debes aceptar los términos y condiciones");
      return;
    }

    // PLACEHOLDER PARA FIREBASE
    console.log("Iniciando registro con:", formData.correo);
    try {
      // 1. const userCredential = await createUserWithEmailAndPassword(auth, formData.correo, formData.password);
      // 2. const user = userCredential.user;
      // 3. await setDoc(doc(db, "usuarios", user.uid), { nombre: formData.nombre, rol: "usuario" });
      console.log("Usuario registrado exitosamente en Auth y Firestore");
      // window.location.href = "/"; // Redirigir al login tras éxito
    } catch (error) {
      console.error("Error en el registro:", error);
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
              />
            </div>
            <span className={styles.helperText}>Debe ser un correo @uandresbello.edu o @unab.cl</span>
          </div>

          <div className={styles.inputGroup}>
            <label>Contraseña</label>
            <div className={styles.inputWrapper}>
              <img src="/candado.png" alt="Candado" className={styles.iconImage} />
              <input 
                type="password" 
                name="password"
                placeholder="Crea una contraseña" 
                value={formData.password}
                onChange={handleChange}
                required
              />
              <img src="/ojo.png" alt="Ver" className={styles.iconImage} style={{ cursor: 'pointer' }} />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Confirmar contraseña</label>
            <div className={styles.inputWrapper}>
              <img src="/candado.png" alt="Candado" className={styles.iconImage} />
              <input 
                type="password" 
                name="confirmPassword"
                placeholder="Confirma tu contraseña" 
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <img src="/ojo.png" alt="Ver" className={styles.iconImage} style={{ cursor: 'pointer' }} />
            </div>
          </div>

          <div className={styles.options}>
            <label className={styles.checkbox}>
              <input 
                type="checkbox" 
                name="aceptaTerminos"
                checked={formData.aceptaTerminos}
                onChange={handleChange}
              />
              <span className={styles.checkmark}></span>
              <span>Acepto los <Link href="#" className={styles.link}>términos y condiciones</Link></span>
            </label>
          </div>

          <button type="submit" className={styles.primaryButton}>
            <img src="/usuario.png" alt="Registrar" className={styles.btnIcon} /> Solicitar registro
          </button>
        </form>

        <p className={styles.footerText}>
          ¿Ya tienes una cuenta? <Link href="/" className={styles.link}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}