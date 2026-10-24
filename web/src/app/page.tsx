import Link from 'next/link';
import styles from './page.module.css';

export default function LoginPage() {
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

        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Correo electrónico</label>
            <div className={styles.inputWrapper}>
              <img src="/correo.png" alt="Correo" className={styles.iconImage} />
              <input type="email" placeholder="tu.correo@ejemplo.com" />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Contraseña</label>
            <div className={styles.inputWrapper}>
              <img src="/candado.png" alt="Candado" className={styles.iconImage} />
              <input type="password" placeholder="Ingresa tu contraseña" />
              <img src="/ojo.png" alt="Ver" className={styles.iconImage} style={{ cursor: 'pointer' }} />
            </div>
          </div>

          <div className={styles.options}>
            <label className={styles.checkbox}>
              <input type="checkbox" />
              <span className={styles.checkmark}></span>
              Recordarme
            </label>
            <Link href="#" className={styles.link}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className={styles.primaryButton}>
            <img src="/flecha.png" alt="Entrar" className={styles.btnIcon} /> Iniciar sesión
          </button>
        </form>

        <p className={styles.footerText}>
          ¿No tienes una cuenta? <Link href="/register" className={styles.link}>Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}