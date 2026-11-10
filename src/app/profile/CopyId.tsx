import { useState } from 'react';
import { copyText } from '@/core/clipboard';
import { Button } from '@/ui/Button';

export function CopyId({ id }: { id: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <code
        data-testid="profile-id"
        style={{
          display: 'block',
          wordBreak: 'break-all',
          userSelect: 'all',
          padding: 'var(--space-2)',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {id}
      </code>
      <Button variant="secondary" onClick={async () => setState((await copyText(id)) ? 'copied' : 'manual')}>
        Copiar ID
      </Button>
      <span role="status" style={{ marginLeft: 'var(--space-3)' }}>
        {state === 'copied' ? 'ID copiado' : state === 'manual' ? 'No se pudo copiar: selecciónalo y cópialo a mano' : ''}
      </span>
    </div>
  );
}
