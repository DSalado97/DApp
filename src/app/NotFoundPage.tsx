import { Link } from 'react-router-dom';
import { Card } from '@/ui/Card';

export function NotFoundPage() {
  return (
    <main style={{ padding: 'var(--space-4)' }}>
      <Card title="Página no encontrada">
        <Link to="/">Volver al inicio</Link>
      </Card>
    </main>
  );
}
