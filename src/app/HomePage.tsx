import { Link } from 'react-router-dom';
import { Card } from '@/ui/Card';
import type { NavEntry } from './ModeLayout';

export function HomePage({ nav }: { nav: NavEntry[] }) {
  return (
    <Card title="Bienvenido">
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
