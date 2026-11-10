import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { issueTestKey } from '@/core/keys/testKeys';
import { createAndActivateProfile, initSession, installKey, shutdownSession, useSession } from '@/core/session';
import { getDb } from '@/data/db';
import { exportProfile } from '@/data/exchange/importer';
import { dataConfig } from './registry';
import { createTestRouter } from './router';

vi.mock('@/core/keys/trustedKeys', async () => {
  const { TEST_PUBLIC_HEX } = await import('@/core/keys/testKeys');
  return { TRUSTED_KEYS: { 1: TEST_PUBLIC_HEX } };
});

let n = 0;
beforeEach(async () => {
  localStorage.clear();
  document.documentElement.style.fontSize = '';
  await initSession(dataConfig, `profile-test-${Date.now()}-${n++}`);
});
afterEach(() => shutdownSession());

const mount = (path = '/') => render(<RouterProvider router={createTestRouter(path)} />);
const active = () => useSession.getState().active!;
const file = (content: string | Uint8Array, name: string) => new File([content as BlobPart], name);
const input = (label: string) => screen.getByLabelText(label, { selector: 'input[type=file]' });

describe('primera ejecución', () => {
  it('pide crear un perfil, valida el nombre y entra en la app', async () => {
    mount();
    expect(screen.getByText('Crea tu perfil')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear perfil' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un nombre');

    await userEvent.type(screen.getByLabelText('Nombre del perfil'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Crear perfil' }));
    expect(await screen.findByText('Bienvenido, Ana')).toBeInTheDocument();
    expect(await getDb().table('profiles').count()).toBe(1);
  });

  it('el input de importar no filtra por extensión (iOS)', () => {
    mount();
    expect(input('Importar perfil desde archivo')).not.toHaveAttribute('accept');
  });
});

describe('pantalla de perfil', () => {
  beforeEach(async () => {
    await createAndActivateProfile('Ana');
  });

  it('muestra el ID para pedir la llave', async () => {
    mount('/perfil');
    expect((await screen.findAllByTestId('profile-id'))[0]).toHaveTextContent(active().id);
  });

  it('guarda el nombre automáticamente al salir del campo', async () => {
    mount('/perfil');
    const field = await screen.findByLabelText('Nombre');
    await userEvent.clear(field);
    await userEvent.type(field, 'Ana Belén');
    await userEvent.tab();
    expect(await screen.findByText('Nombre guardado')).toBeInTheDocument();
    expect(active().name).toBe('Ana Belén');
    expect((await getDb().table('profiles').get(active().id)).name).toBe('Ana Belén');
  });

  it('no guarda un nombre vacío y lo explica', async () => {
    mount('/perfil');
    const field = await screen.findByLabelText('Nombre');
    await userEvent.clear(field);
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe un nombre');
    await userEvent.tab();
    expect(active().name).toBe('Ana');
  });

  it('importa una llave válida y aparece el Modo DJ', async () => {
    mount('/perfil');
    expect(screen.queryByRole('link', { name: 'Modo DJ' })).not.toBeInTheDocument();
    await userEvent.upload(input('Importar llave'), file(issueTestKey({ profileId: active().id }), 'ana.dagekey'));
    expect(await screen.findByText('Llave instalada.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Modo DJ' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Modo DJ' }));
    expect(await screen.findByText('Panel del DJ')).toBeInTheDocument();
  });

  it('rechaza una llave de otro perfil y un archivo cualquiera, sin activar el DJ', async () => {
    mount('/perfil');
    await userEvent.upload(input('Importar llave'), file(issueTestKey({ profileId: 'otro' }), 'ajena.dagekey'));
    expect(await screen.findByRole('alert')).toHaveTextContent('otro perfil');
    await userEvent.upload(input('Importar llave'), file('hola', 'notas.txt'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('no es una llave'));
    expect(screen.queryByRole('link', { name: 'Modo DJ' })).not.toBeInTheDocument();
  });

  it('avisa cuando la llave guardada ya no es válida', async () => {
    await installKey(issueTestKey({ profileId: active().id, expiresAt: new Date(Date.now() + 5000).toISOString() }));
    useSession.setState({ key: { status: 'invalid', code: 'expired', message: 'La llave ha caducado.' } });
    mount('/perfil');
    expect(await screen.findByText(/La llave guardada ya no es válida: La llave ha caducado/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Modo DJ' })).not.toBeInTheDocument();
  });

  it('crea otro perfil y cambia entre perfiles', async () => {
    mount('/perfil');
    await userEvent.type(await screen.findByLabelText('Nuevo perfil'), 'Beto');
    await userEvent.click(screen.getByRole('button', { name: 'Crear perfil' }));
    await waitFor(() => expect(active().name).toBe('Beto'));
    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar a Ana' }));
    await waitFor(() => expect(active().name).toBe('Ana'));
  });

  it('borra el perfil tras confirmar y vuelve a la bienvenida sin dejar datos', async () => {
    mount('/perfil');
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar este perfil' }));
    expect(screen.getByText(/No se puede deshacer/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Borrar definitivamente' }));
    expect(await screen.findByText('Crea tu perfil')).toBeInTheDocument();
    for (const t of ['profiles', 'settings', 'credentials', 'snapshots']) expect(await getDb().table(t).count(), t).toBe(0);
  });

  it('cancelar el borrado no borra nada', async () => {
    mount('/perfil');
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar este perfil' }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Borrar este perfil' })).getByRole('button', { name: 'Cancelar' }));
    expect(await getDb().table('profiles').count()).toBe(1);
  });

  it('crea una copia local y la lista', async () => {
    mount('/perfil');
    expect(await screen.findByText('No hay copias locales.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear copia local ahora' }));
    expect(await screen.findAllByTestId('snapshot')).toHaveLength(1);
  });
});

describe('importar un perfil', () => {
  it('desde la bienvenida: resumen, importar y entrar con el mismo ID', async () => {
    const p = await createAndActivateProfile('Ana');
    await installKey(issueTestKey({ profileId: p.id }));
    const { text } = await exportProfile(p.id);
    await getDb().transaction('rw', getDb().tables, async () => {
      for (const t of getDb().tables) await t.clear();
    });
    shutdownSession();
    localStorage.clear();
    await initSession(dataConfig, `profile-test-reimport-${n++}`);

    mount();
    await userEvent.upload(input('Importar perfil desde archivo'), file(text, 'ana.dageprofile'));
    expect(await screen.findByText('Perfil «Ana»')).toBeInTheDocument();
    expect(screen.getByText('Incluye una llave del DJ.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Importar perfil' }));
    expect(await screen.findByText('Bienvenido, Ana')).toBeInTheDocument();
    expect(active().id).toBe(p.id);
    expect(useSession.getState().key.status).toBe('valid'); // la credencial viajó con el perfil
  });

  it('rechaza un archivo alterado con un mensaje claro', async () => {
    const p = await createAndActivateProfile('Ana');
    const { text } = await exportProfile(p.id);
    mount('/perfil');
    await userEvent.upload(input('Importar perfil desde archivo'), file(text.replace('"Ana"', '"Eva"'), 'x.dageprofile'));
    expect(await screen.findByRole('alert')).toHaveTextContent('suma de comprobación');
  });

  it('avisa si el archivo es más antiguo y avisa de la pérdida de la llave al importar como independiente', async () => {
    const p = await createAndActivateProfile('Ana');
    await installKey(issueTestKey({ profileId: p.id }));
    const { text } = await exportProfile(p.id);
    await getDb().table('profiles').update(p.id, { revision: 99, modifiedAt: new Date(Date.now() + 1000).toISOString() });
    mount('/perfil');
    await userEvent.upload(input('Importar perfil desde archivo'), file(text, 'ana.dageprofile'));
    expect(await screen.findByText(/Es más antiguo que el perfil que ya tienes/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Importar como perfil independiente' }));
    expect(screen.getByText(/se descartará la llave/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Importar como independiente' }));
    await waitFor(() => expect(active().name).toBe('Ana (copia)'));
    expect(active().id).not.toBe(p.id);
    expect(useSession.getState().key.status).toBe('none');
  });
});

describe('ajustes', () => {
  beforeEach(async () => {
    await createAndActivateProfile('Ana');
  });

  it('el tamaño de texto cambia la interfaz y persiste en el perfil', async () => {
    mount('/ajustes');
    await userEvent.click(await screen.findByLabelText('Grande'));
    await waitFor(() => expect(document.documentElement.style.fontSize).toBe('115%'));
    expect((await getDb().table('settings').get(active().id)).textScale).toBe('large');
  });

  it('muestra el estado del almacenamiento', async () => {
    mount('/ajustes');
    expect(await screen.findByText(/Almacenamiento persistente:/)).toBeInTheDocument();
  });

  it('avisa si hace tiempo que no hay copia de seguridad, y deja de avisar al desactivarlo', async () => {
    useSession.setState({ active: { ...active(), createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString() } });
    mount('/');
    expect(await screen.findByText(/Aún no has hecho ninguna copia de seguridad/)).toBeInTheDocument();
    useSession.setState((s) => ({ settings: { ...s.settings!, backupReminderDays: 0 } }));
    await waitFor(() => expect(screen.queryByText(/Aún no has hecho ninguna copia/)).not.toBeInTheDocument());
  });
});
