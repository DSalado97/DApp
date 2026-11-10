import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { revalidateKey, useSession } from '@/core/session';
import { Card } from '@/ui/Card';
import { WelcomePage } from './WelcomePage';

const SCALE = { normal: '100%', large: '115%', xlarge: '130%' } as const;
const MAX_TIMEOUT = 2 ** 31 - 1;

/** Efectos globales de la sesión: tamaño de texto y revalidación de la llave (al volver a primer plano y al caducar). */
function useSessionEffects() {
  const textScale = useSession((s) => s.settings?.textScale ?? 'normal');
  const expiresAt = useSession((s) => (s.key.status === 'valid' ? s.key.claims.expiresAt : undefined));
  const profileId = useSession((s) => s.active?.id);

  useEffect(() => {
    document.documentElement.style.fontSize = SCALE[textScale];
  }, [textScale]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void revalidateKey();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const ms = Date.parse(expiresAt) - Date.now();
    const t = setTimeout(() => void revalidateKey(), Math.min(Math.max(ms, 0) + 50, MAX_TIMEOUT));
    return () => clearTimeout(t);
  }, [expiresAt, profileId]);
}

/** Ruta raíz: espera a la base de datos, muestra errores y, sin perfiles, la pantalla de bienvenida. */
export function SessionGate() {
  const status = useSession((s) => s.status);
  const error = useSession((s) => s.error);
  const hasProfile = useSession((s) => s.active !== null);
  useSessionEffects();

  if (status === 'loading') return <p style={{ padding: 'var(--space-4)' }}>Cargando…</p>;
  if (status === 'error') {
    return (
      <main style={{ padding: 'var(--space-4)' }}>
        <Card title="No se puede abrir tu información">
          <p>{error}</p>
        </Card>
      </main>
    );
  }
  return hasProfile ? <Outlet /> : <WelcomePage />;
}
