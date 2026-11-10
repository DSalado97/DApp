import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Permission } from '@/core/modules';
import { useHasDmAccess, usePermission } from '@/core/permissions';
import { useSession } from '@/core/session';
import { Card } from '@/ui/Card';
import { PERMISSION_LABELS } from './profile/KeySection';

/** Pantalla que ve quien intenta entrar en el Modo DJ sin una llave válida. */
export function DmLocked() {
  const key = useSession((s) => s.key);
  return (
    <main style={{ padding: 'var(--space-4)', maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <Card title="Modo DJ bloqueado">
        <p>
          {key.status === 'invalid'
            ? `La llave de este perfil no es válida: ${key.message}`
            : 'El Modo DJ necesita una llave (.dagekey) emitida para tu perfil.'}
        </p>
        <p>
          <Link to="/perfil">Ir a Perfil para importar la llave</Link>
        </p>
        <p>
          <Link to="/">Volver al Modo Jugador</Link>
        </p>
      </Card>
    </main>
  );
}

/** Protege el layout del DJ: sin llave válida no se monta nada de él. */
export function DmGate({ children }: { children: ReactNode }) {
  return useHasDmAccess() ? <>{children}</> : <DmLocked />;
}

/** Cada ruta del DJ declara su permiso. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  return usePermission(permission) ? <>{children}</> : <DmLocked />;
}

export function DmHome() {
  const key = useSession((s) => s.key);
  if (key.status !== 'valid') return null;
  const exp = key.claims.expiresAt;
  return (
    <Card title="Panel del DJ">
      <p>
        Llave válida{exp ? ` hasta el ${new Date(exp).toLocaleDateString('es-ES', { dateStyle: 'long' })}` : ' sin caducidad'}.
        Permisos:
      </p>
      <ul>
        {key.claims.permissions.map((p) => (
          <li key={p}>{PERMISSION_LABELS[p] ?? p}</li>
        ))}
      </ul>
      <p>Las herramientas del DJ aparecerán aquí a medida que se incorporen a la aplicación.</p>
    </Card>
  );
}
