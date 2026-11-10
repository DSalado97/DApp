import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import type { FeatureManifest } from '@/core/modules';
import { validateManifests } from '@/core/modules';
import { issueTestKey } from '@/core/keys/testKeys';
import { createAndActivateProfile, initSession, installKey, shutdownSession, uninstallKey, useSession } from '@/core/session';
import { dataConfig, manifests } from './registry';
import { buildRoutes, createTestRouter } from './router';

vi.mock('@/core/keys/trustedKeys', async () => {
  const { TEST_PUBLIC_HEX } = await import('@/core/keys/testKeys');
  return { TRUSTED_KEYS: { 1: TEST_PUBLIC_HEX } };
});

const dummy = (id: string, requiredPermission: FeatureManifest['requiredPermission']): FeatureManifest => ({
  id,
  routes: [{ path: id, Component: () => <p>pantalla {id}</p> }],
  nav: { label: id, to: id },
  requiredPermission,
  ownedStores: [],
  migrations: [],
});

let n = 0;
beforeEach(async () => {
  localStorage.clear();
  await initSession(dataConfig, `app-test-${Date.now()}-${n++}`);
  await createAndActivateProfile('Ana');
});
afterEach(() => shutdownSession());

const profileId = () => useSession.getState().active!.id;

describe('registro de módulos', () => {
  it('tiene ids únicos', () => {
    expect(() => validateManifests(manifests)).not.toThrow();
    expect(() => validateManifests([dummy('a', null), dummy('a', null)])).toThrow(/duplicado/);
  });
});

describe('shell', () => {
  it('muestra inicio y navega al reglamento', async () => {
    render(<RouterProvider router={createTestRouter('/')} />);
    expect(screen.getByText('Bienvenido, Ana')).toBeInTheDocument();
    const nav = within(screen.getByRole('navigation', { name: 'Navegación principal' }));
    await userEvent.click(nav.getByRole('link', { name: 'Reglas' }));
    expect(screen.getByRole('heading', { name: 'Reglamento' })).toBeInTheDocument();
  });

  it('un módulo añadido solo con su manifiesto aparece en rutas y navegación', () => {
    const routes = buildRoutes([...manifests, dummy('nuevo', null)]);
    render(<RouterProvider router={createTestRouter('/nuevo', routes)} />);
    expect(screen.getByText('pantalla nuevo')).toBeInTheDocument();
    const nav = within(screen.getByRole('navigation', { name: 'Navegación principal' }));
    expect(nav.getByRole('link', { name: 'nuevo' })).toBeInTheDocument();
  });
});

describe('Modo DJ protegido', () => {
  it('sin llave el layout y las rutas del DJ están bloqueados', () => {
    const routes = buildRoutes([...manifests, dummy('combat', 'dm.combat')]);
    for (const path of ['/dm', '/dm/combat']) {
      const { unmount } = render(<RouterProvider router={createTestRouter(path, routes)} />);
      expect(screen.getByText('Modo DJ bloqueado')).toBeInTheDocument();
      expect(screen.queryByText('pantalla combat')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('sin llave no hay acceso al Modo DJ desde el Modo Jugador', () => {
    render(<RouterProvider router={createTestRouter('/')} />);
    expect(screen.queryByRole('link', { name: 'Modo DJ' })).not.toBeInTheDocument();
  });

  it('con una llave válida se monta el DJ y se puede volver al Modo Jugador', async () => {
    await installKey(issueTestKey({ profileId: profileId() }));
    const routes = buildRoutes([...manifests, dummy('combat', 'dm.combat')]);
    render(<RouterProvider router={createTestRouter('/', routes)} />);
    await userEvent.click(screen.getByRole('link', { name: 'Modo DJ' }));
    expect(screen.getByText('Panel del DJ')).toBeInTheDocument();
    const nav = within(screen.getByRole('navigation', { name: 'Navegación principal' }));
    await userEvent.click(nav.getByRole('link', { name: 'combat' }));
    expect(screen.getByText('pantalla combat')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Modo Jugador' }));
    expect(screen.getByText('Bienvenido, Ana')).toBeInTheDocument();
  });

  it('cada ruta exige su permiso: la llave sin dm.combat no abre combate ni lo muestra en el menú', async () => {
    await installKey(issueTestKey({ profileId: profileId(), permissions: ['dm.tools'] }));
    const routes = buildRoutes([...manifests, dummy('combat', 'dm.combat'), dummy('tools', 'dm.tools')]);
    const { unmount } = render(<RouterProvider router={createTestRouter('/dm', routes)} />);
    const nav = within(screen.getByRole('navigation', { name: 'Navegación principal' }));
    expect(nav.getByRole('link', { name: 'tools' })).toBeInTheDocument();
    expect(nav.queryByRole('link', { name: 'combat' })).not.toBeInTheDocument();
    unmount();

    render(<RouterProvider router={createTestRouter('/dm/combat', routes)} />);
    expect(screen.getByText('Modo DJ bloqueado')).toBeInTheDocument();
    expect(screen.queryByText('pantalla combat')).not.toBeInTheDocument();
  });

  it('quitar la llave revoca el acceso sin recargar', async () => {
    await installKey(issueTestKey({ profileId: profileId() }));
    render(<RouterProvider router={createTestRouter('/dm')} />);
    expect(screen.getByText('Panel del DJ')).toBeInTheDocument();
    await act(() => uninstallKey());
    expect(screen.getByText('Modo DJ bloqueado')).toBeInTheDocument();
  });
});
