import { useSyncExternalStore } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styles from './ModeLayout.module.css';

export interface NavEntry {
  label: string;
  to: string;
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

export function ModeLayout({ title, nav, homeTo = '/' }: { title: string; nav: NavEntry[]; homeTo?: string }) {
  const online = useOnline();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1>{title}</h1>
        {online ? null : (
          <span className={styles.offline} role="status">
            Sin conexión
          </span>
        )}
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <nav className={styles.nav} aria-label="Navegación principal">
        <NavLink to={homeTo} end className={styles.link}>
          Inicio
        </NavLink>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} className={styles.link}>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
