import { useRef } from 'react';
import { Button, type ButtonVariant } from './Button';

/**
 * Selector de archivo SIN filtro de extensión (`accept`): iOS puede bloquear extensiones propias
 * (.dageprofile, .dagekey). El contenido se valida después.
 */
export function FilePicker({
  label,
  onFile,
  variant = 'secondary',
  disabled,
}: {
  label: string;
  onFile: (file: File) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant={variant} disabled={disabled} onClick={() => ref.current?.click()}>
        {label}
      </Button>
      <input
        ref={ref}
        type="file"
        hidden
        aria-label={label}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // permite elegir el mismo archivo otra vez
          if (file) onFile(file);
        }}
      />
    </>
  );
}
