import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { useState } from 'react';

export function ExamplePage() {
  const [count, setCount] = useState(0);
  return (
    <Card title="Módulo de ejemplo">
      <p>
        Este módulo se añade solo con su manifiesto y una línea en el registro. Sirve de plantilla y se elimina cuando
        exista la primera feature real.
      </p>
      <Button onClick={() => setCount((c) => c + 1)}>Toques: {count}</Button>
    </Card>
  );
}
