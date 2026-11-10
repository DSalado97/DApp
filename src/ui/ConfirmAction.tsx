import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import styles from './ConfirmAction.module.css';

/** Acción destructiva con confirmación en línea (sin diálogos modales: funciona igual en móvil y en tests). */
export function ConfirmAction({
  label,
  message,
  confirmLabel,
  onConfirm,
  variant = 'danger',
}: {
  label: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'danger' | 'secondary';
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <Button variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div className={styles.confirm} role="group" aria-label={label}>
      <p>{message}</p>
      <div className={styles.row}>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          Cancelar
        </Button>
        <Button
          variant={variant}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              setOpen(false);
            }
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
