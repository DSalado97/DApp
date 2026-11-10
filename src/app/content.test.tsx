import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { issueTestKey } from '@/core/keys/testKeys';
import { createAndActivateProfile, initSession, installKey, shutdownSession, useSession } from '@/core/session';
import { dataConfig } from './registry';
import { createTestRouter } from './router';

vi.mock('@/core/keys/trustedKeys', async () => {
  const { TEST_PUBLIC_HEX } = await import('@/core/keys/testKeys');
  return { TRUSTED_KEYS: { 1: TEST_PUBLIC_HEX } };
});

let n = 0;
beforeEach(async () => {
  localStorage.clear();
  await initSession(dataConfig, `content-test-${Date.now()}-${n++}`);
  await createAndActivateProfile('Ana');
});
afterEach(() => shutdownSession());

const profileId = () => useSession.getState().active!.id;
const open = (path: string) => render(<RouterProvider router={createTestRouter(path)} />);

describe('Reglamento (Modo Jugador)', () => {
  it('busca por nombre y abre la ficha con los datos del manual', async () => {
    open('/reglas');
    expect(screen.getByRole('heading', { name: 'Reglamento' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Buscar'), 'virote');
    await userEvent.click(await screen.findByRole('link', { name: /Virote Arcano/ }));
    expect(screen.getByRole('heading', { name: 'Virote Arcano' })).toBeInTheDocument();
    expect(screen.getByText('2 PM')).toBeInTheDocument();
    expect(screen.getByText('NO de lanzamiento')).toBeInTheDocument();
    expect(screen.getByText(/Destreza \(Acrobacia\) contra Potencia mágica/)).toBeInTheDocument();
  });

  it('los términos del compendio encuentran el nombre del manual', async () => {
    open('/reglas');
    await userEvent.type(screen.getByLabelText('Buscar'), 'martillo de guerra');
    expect(await screen.findByRole('link', { name: /Mazo/ })).toBeInTheDocument();
  });

  it('explorar por categorías sin escribir nada y filtrar', async () => {
    open('/reglas');
    const groups = () => [...document.querySelectorAll('details summary')].map((s) => s.textContent ?? '');
    expect(groups().length).toBeGreaterThan(10);
    expect(groups().some((g) => g.startsWith('Hechizos'))).toBe(true);
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'Talentos');
    expect(groups()).toEqual(['Talentos (22)']);
  });

  it('un jugador no encuentra contenido del DJ ni abriendo su dirección', async () => {
    const { unmount } = open('/reglas');
    await userEvent.type(screen.getByLabelText('Buscar'), 'Hurlock');
    expect(await screen.findByText(/Sin resultados/)).toBeInTheDocument();
    unmount();
    open('/reglas/creature/hurlock');
    expect(screen.getByText('No se ha encontrado ese registro.')).toBeInTheDocument();
    expect(screen.queryByText('Espada a dos manos')).not.toBeInTheDocument();
  });

  it('muestra la ficha de un arma con las correcciones del manual', async () => {
    open('/reglas/weapon/mazo');
    expect(screen.getByRole('heading', { name: 'Mazo' })).toBeInTheDocument();
    expect(screen.getByText(/Martillo de guerra/)).toBeInTheDocument();
    expect(screen.getByText('Armas contundentes')).toBeInTheDocument();
    expect(screen.getByText('14 mp')).toBeInTheDocument();
    expect(screen.getByText(/1d6−1/)).toBeInTheDocument();
  });

  it('las secciones del compendio con correcciones verificadas se muestran', async () => {
    open('/reglas/narrative/7.6');
    expect(screen.getAllByText(/Corrección verificada en el manual/).length).toBeGreaterThan(0);
  });
});

describe('Compendio del DJ (permiso dm.compendium)', () => {
  it('sin llave está bloqueado', () => {
    open('/dm/compendio');
    expect(screen.getByText('Modo DJ bloqueado')).toBeInTheDocument();
  });

  it('una llave sin dm.compendium no abre el compendio ni lo muestra en el menú', async () => {
    await installKey(issueTestKey({ profileId: profileId(), permissions: ['dm.combat'] }));
    const { unmount } = open('/dm');
    const nav = within(screen.getByRole('navigation', { name: 'Navegación principal' }));
    expect(nav.queryByRole('link', { name: 'Compendio' })).not.toBeInTheDocument();
    unmount();
    open('/dm/compendio');
    expect(screen.getByText('Modo DJ bloqueado')).toBeInTheDocument();
  });

  it('con permiso carga el contenido del DJ, busca criaturas y muestra la ficha literal', async () => {
    await installKey(issueTestKey({ profileId: profileId(), permissions: ['dm.compendium'] }));
    open('/dm/compendio');
    await userEvent.type(await screen.findByLabelText('Buscar'), 'hurlock');
    await userEvent.click(await screen.findByRole('link', { name: /^Hurlock/ }));
    expect(await screen.findByRole('heading', { name: 'Hurlock' })).toBeInTheDocument();
    expect(screen.getByText('Espada a dos manos')).toBeInTheDocument();
    expect(screen.getByText('+6')).toBeInTheDocument();
    expect(screen.getByText(/3d6\+4/)).toBeInTheDocument();
    expect(screen.getByText(/Ataque furioso/)).toBeInTheDocument();
    expect(screen.getByText(/Golpe doble/, { selector: 'dd' })).toBeInTheDocument();
  });

  it('el compendio también ofrece el reglamento del jugador y puede limitarse al contenido del DJ', async () => {
    await installKey(issueTestKey({ profileId: profileId(), permissions: ['dm.compendium'] }));
    open('/dm/compendio');
    const search = await screen.findByLabelText('Buscar');
    await userEvent.type(search, 'virote');
    expect(await screen.findByRole('link', { name: /Virote Arcano/ })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Solo contenido del DJ'));
    expect(screen.queryByRole('link', { name: /Virote Arcano/ })).not.toBeInTheDocument();
  });
});

describe('Lanzador de dados', () => {
  it('tirada de atributo: muestra dados, total y resultado frente al NO', async () => {
    open('/dados');
    await userEvent.click(screen.getByRole('button', { name: 'Tirar 3d6' }));
    expect(screen.getByText(/Total/)).toBeInTheDocument();
    expect(screen.getByText(/^(Éxito|Fallo):/)).toBeInTheDocument();
    expect(screen.getByText('Historial')).toBeInTheDocument();
  });

  it('valida los campos antes de tirar', async () => {
    open('/dados');
    await userEvent.clear(screen.getByLabelText('Atributo'));
    await userEvent.type(screen.getByLabelText('Atributo'), 'abc');
    expect(screen.getByText('Introduce un número entero')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tirar 3d6' })).toBeDisabled();
  });

  it('tirada enfrentada: decide un ganador o empate', async () => {
    open('/dados');
    await userEvent.click(screen.getByRole('button', { name: 'Enfrentada' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tirar enfrentada' }));
    expect(screen.getByText(/^(Gana [AB]|Empate)/)).toBeInTheDocument();
  });

  it('tirada avanzada: acumula progreso y se puede reiniciar', async () => {
    open('/dados');
    await userEvent.click(screen.getByRole('button', { name: 'Avanzada' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tirar' }));
    expect(screen.getByText(/Progreso/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(screen.queryByText(/Progreso/)).not.toBeInTheDocument();
  });

  it('dados sueltos: tirada rápida y expresión libre', async () => {
    open('/dados');
    await userEvent.click(screen.getByRole('button', { name: 'Dados' }));
    await userEvent.click(screen.getByRole('button', { name: '2d6' }));
    expect(screen.getByText('2d6', { selector: 'strong' })).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Expresión'));
    await userEvent.type(screen.getByLabelText('Expresión'), '2d8');
    expect(screen.getByText(/dados de 3 o 6 caras/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tirar' })).toBeDisabled();
  });
});
