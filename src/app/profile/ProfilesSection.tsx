import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAutosaver } from '@/core/autosave';
import { createAndActivateProfile, deleteProfileById, renameActiveProfile, switchProfile, useSession } from '@/core/session';
import { parseProfileName } from '@/data/profiles';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmAction } from '@/ui/ConfirmAction';
import { Field } from '@/ui/Field';
import { CopyId } from './CopyId';

export function ActiveProfileCard() {
  const active = useSession((s) => s.active);
  if (!active) return null;
  // `key` reinicia el editor al cambiar de perfil.
  return (
    <Card title="Tu perfil">
      <NameEditor key={active.id} initialName={active.name} />
      <p>ID del perfil (sirve para solicitar la llave del DJ):</p>
      <CopyId id={active.id} />
    </Card>
  );
}

function NameEditor({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // El nombre se guarda solo, con debounce y al pasar a segundo plano.
  const [saver] = useState(() => {
    const state = { last: initialName };
    return createAutosaver<string>(async (value) => {
      if (value === state.last) return;
      await renameActiveProfile(value);
      state.last = value;
      setSaved(true);
    });
  });
  useEffect(
    () => () => {
      void saver.flush();
      saver.dispose();
    },
    [saver],
  );

  return (
    <>
      <Field
        label="Nombre"
        value={name}
        error={error}
        hint="Se guarda automáticamente."
        autoComplete="off"
        maxLength={60}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
          const parsed = parseProfileName(e.target.value);
          if (parsed.ok) {
            setError(null);
            saver.schedule(parsed.name);
          } else {
            setError(parsed.error);
            saver.cancel();
          }
        }}
        onBlur={() => void saver.flush()}
      />
      <span role="status">{saved ? 'Nombre guardado' : ''}</span>
    </>
  );
}

export function SwitchProfilesCard() {
  const profiles = useSession((s) => s.profiles);
  const active = useSession((s) => s.active);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    const parsed = parseProfileName(name);
    if (!parsed.ok) return setError(parsed.error);
    await createAndActivateProfile(parsed.name);
    setName('');
  }

  return (
    <Card title="Perfiles de este dispositivo">
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--space-2)' }}>
        {profiles.map((p) => (
          <li key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
            <span>
              {p.name}
              {p.id === active?.id ? ' (activo)' : ''}
            </span>
            {p.id === active?.id ? null : (
              <Button variant="secondary" onClick={() => void switchProfile(p.id)} aria-label={`Cambiar a ${p.name}`}>
                Cambiar
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={create} noValidate>
        <Field
          label="Nuevo perfil"
          value={name}
          error={error}
          autoComplete="off"
          maxLength={60}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        <Button type="submit" variant="secondary">
          Crear perfil
        </Button>
      </form>
    </Card>
  );
}

export function DeleteProfileCard() {
  const active = useSession((s) => s.active);
  const navigate = useNavigate();
  if (!active) return null;
  return (
    <Card title="Borrar perfil">
      <p>Elimina de este dispositivo el perfil y todo lo que contiene: datos, llave y copias locales.</p>
      <ConfirmAction
        label="Borrar este perfil"
        confirmLabel="Borrar definitivamente"
        message={`Se borrará «${active.name}» con todos sus datos. No se puede deshacer. Si lo necesitas, exporta antes una copia.`}
        onConfirm={async () => {
          await deleteProfileById(active.id);
          void navigate('/', { replace: true }); // si no queda ningún perfil, se verá la bienvenida
        }}
      />
    </Card>
  );
}
