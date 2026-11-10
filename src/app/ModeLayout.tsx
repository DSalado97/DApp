import { useState, useSyncExternalStore } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import type { Permission } from '@/core/modules';
import { keyPermits, useHasDmAccess } from '@/core/permissions';
import { useSession } from '@/core/session';
import { Notice } from '@/ui/Notice';
import styles from './ModeLayout.module.css';

export interface NavEntry {
  label: string;
  to: string;
  /** Permiso requerido; la entrada solo se muestra si hay una llave válida que lo conceda. */
  permission?: Permission | null;
}

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}
const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

const DAY = 24 * 3600 * 1000;

/** Aviso si la última copia (o la creación del perfil) es más antigua que el recordatorio elegido. */
function BackupReminder() {
  const active = useSession((s) => s.active);
  const settings = useSession((s) => s.settings);
  const [now] = useState(() => Date.now());
  if (!active || !settings || settings.backupReminderDays === 0) return null;
  const since = Date.parse(settings.lastBackupAt ?? active.createdAt);
  const days = Math.floor((now - since) / DAY);
  if (days < settings.backupReminderDays) return null;
  return (
    <Notice kind="warn">
      {settings.lastBackupAt ? `Hace ${days} días que no haces una copia de seguridad.` : 'Aún no has hecho ninguna copia de seguridad.'}{' '}
      <Link to="/perfil">Hacer copia</Link>
    </Notice>
  );
}

export function ModeLayout({ mode, nav }: { mode: 'player' | 'dm'; nav: NavEntry[] }) {
  const online = useOnline();
  const key = useSession((s) => s.key);
  const profileName = useSession((s) => s.active?.name);
  const dmAccess = useHasDmAccess();
  const visible = nav.filter((n) => keyPermits(key, n.permission ?? null));
  const player = mode === 'player';

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.top}>
          <h1>{player ? 'Dragon Age' : 'Modo DJ'}</h1>
          {online ? null : (
            <span className={styles.offline} role="status">
              Sin conexión
            </span>
          )}
        </div>
        <div className={styles.tools}>
          <Link to="/perfil" className={styles.tool}>
            {profileName ?? 'Perfil'}
          </Link>
          <Link to="/ajustes" className={styles.tool}>
            Ajustes
          </Link>
          {player && dmAccess ? (
            <Link to="/dm" className={styles.tool}>
              Modo DJ
            </Link>
          ) : null}
          {!player ? (
            <Link to="/" className={styles.tool}>
              Modo Jugador
            </Link>
          ) : null}
        </div>
      </header>
      <main className={styles.main}>
        <BackupReminder />
        <Outlet />
      </main>
      <nav className={styles.nav} aria-label="Navegación principal">
        <NavLink to={player ? '/' : '/dm'} end className={styles.link}>
          Inicio
        </NavLink>
        {visible.map((n) => (
          <NavLink key={n.to} to={n.to} className={styles.link}>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
