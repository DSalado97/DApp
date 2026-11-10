import { Link } from 'react-router-dom';
import { useSession } from '@/core/session';
import { Card } from '@/ui/Card';
import type { NavEntry } from './ModeLayout';

export function HomePage({ nav }: { nav: NavEntry[] }) {
  const name = useSession((s) => s.active?.name);
  return (
    <Card title={name ? `Bienvenido, ${name}` : 'Bienvenido'}>
      <p>Gestor de personajes y partidas de Dragon Age (Caja Básica). Funciona sin conexión.</p>
      <ul>
        {nav.map((n) => (
          <li key={n.to}>
            <Link to={n.to}>{n.label}</Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
