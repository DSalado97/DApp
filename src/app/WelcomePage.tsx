import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAndActivateProfile } from '@/core/session';
import { parseProfileName } from '@/data/profiles';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { ImportFlow } from './ImportFlow';

/** Primera ejecución (sin perfiles): crear uno o importarlo. */
export function WelcomePage() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseProfileName(name);
    if (!parsed.ok) return setError(parsed.error);
    setBusy(true);
    try {
      await createAndActivateProfile(parsed.name);
      void navigate('/', { replace: true });
    } catch {
      setError('No se pudo crear el perfil.');
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 'var(--space-4)', maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <h1>Dragon Age DM Station</h1>
      <Card title="Crea tu perfil">
        <p>
          Todo se guarda en este dispositivo, sin cuentas. Un perfil agrupa tus personajes y partidas; podrás crear más y
          llevarte una copia a otro dispositivo.
        </p>
        <form onSubmit={submit} noValidate>
          <Field
            label="Nombre del perfil"
            value={name}
            error={error}
            autoComplete="off"
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
          <Button type="submit" disabled={busy}>
            Crear perfil
          </Button>
        </form>
      </Card>
      <Card title="¿Ya tienes una copia?">
        <p>Importa un archivo de perfil (.dageprofile) exportado desde otro dispositivo o como copia de seguridad.</p>
        <ImportFlow onDone={() => void navigate('/', { replace: true })} />
      </Card>
    </main>
  );
}
