import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import type { FeatureManifest } from '@/core/modules';
import { validateManifests } from '@/core/modules';
import { manifests } from './registry';
import { buildRoutes, createTestRouter } from './router';

const dummy = (id: string, requiredPermission: FeatureManifest['requiredPermission']): FeatureManifest => ({
  id,
  routes: [{ path: id, Component: () => <p>pantalla {id}</p> }],
  nav: { label: id, to: id },
  requiredPermission,
  ownedStores: [],
  migrations: [],
});

describe('registro de módulos', () => {
  it('tiene ids únicos', () => {
    expect(() => validateManifests(manifests)).not.toThrow();
    expect(() => validateManifests([dummy('a', null), dummy('a', null)])).toThrow(/duplicado/);
  });
});

describe('shell', () => {
  it('muestra inicio y navega al módulo de ejemplo', async () => {
    render(<RouterProvider router={createTestRouter('/')} />);
    expect(screen.getByText('Bienvenido')).toBeInTheDocument();
    const nav = within(screen.getByRole('navigation', { name: 'Navegación principal' }));
    await userEvent.click(nav.getByRole('link', { name: 'Ejemplo' }));
    expect(screen.getByText('Módulo de ejemplo')).toBeInTheDocument();
  });

  it('un módulo añadido solo con su manifiesto aparece en rutas y navegación', () => {
    const routes = buildRoutes([...manifests, dummy('nuevo', null)]);
    render(<RouterProvider router={createTestRouter('/nuevo', routes)} />);
    expect(screen.getByText('pantalla nuevo')).toBeInTheDocument();
    const nav = within(screen.getByRole('navigation', { name: 'Navegación principal' }));
    expect(nav.getByRole('link', { name: 'nuevo' })).toBeInTheDocument();
  });

  it('el layout del DJ no existe sin permisos', () => {
    const routes = buildRoutes([...manifests, dummy('combat', 'dm.combat')]);
    render(<RouterProvider router={createTestRouter('/dm/combat', routes)} />);
    expect(screen.getByText('Página no encontrada')).toBeInTheDocument();
  });

  it('con permiso concedido el módulo de DJ se monta bajo /dm', () => {
    const routes = buildRoutes([dummy('combat', 'dm.combat')], () => true);
    render(<RouterProvider router={createTestRouter('/dm/combat', routes)} />);
    expect(screen.getByText('pantalla combat')).toBeInTheDocument();
    expect(screen.getByText('Modo DJ')).toBeInTheDocument();
  });
});
