import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom';
import type { FeatureManifest } from '@/core/modules';
import { hasPermission } from '@/core/permissions';
import { manifests } from './registry';
import { ModeLayout, type NavEntry } from './ModeLayout';
import { HomePage } from './HomePage';
import { NotFoundPage } from './NotFoundPage';

export type Mode = 'player' | 'dm';

/** Un módulo sin permiso requerido pertenece al Modo Jugador; con permiso, al Modo DJ. */
export function modulesForMode(all: readonly FeatureManifest[], mode: Mode, allowed = hasPermission) {
  return all.filter((m) => (mode === 'player' ? m.requiredPermission === null : allowed(m.requiredPermission)));
}

export function navFor(mods: readonly FeatureManifest[], prefix: string): NavEntry[] {
  return mods.flatMap((m) => (m.nav ? [{ label: m.nav.label, to: `${prefix}${m.nav.to}` }] : []));
}

export function buildRoutes(all: readonly FeatureManifest[] = manifests, allowed = hasPermission): RouteObject[] {
  const player = modulesForMode(all, 'player', allowed);
  const dm = modulesForMode(all, 'dm', allowed).filter((m) => m.requiredPermission !== null);

  const toRoutes = (mods: readonly FeatureManifest[]): RouteObject[] =>
    mods.flatMap((m) => m.routes.map((r) => ({ path: r.path, element: <r.Component /> })));

  const routes: RouteObject[] = [
    {
      path: '/',
      element: <ModeLayout title="Dragon Age" nav={navFor(player, '/')} />,
      children: [{ index: true, element: <HomePage nav={navFor(player, '/')} /> }, ...toRoutes(player)],
    },
  ];

  // El layout del DJ solo existe si hay módulos de DJ autorizados: nada de pantallas vacías.
  if (dm.length > 0) {
    routes.push({
      path: '/dm',
      element: <ModeLayout title="Modo DJ" nav={navFor(dm, '/dm/')} homeTo="/dm" />,
      children: toRoutes(dm),
    });
  }

  routes.push({ path: '*', element: <NotFoundPage /> });
  return routes;
}

export const createAppRouter = () => createBrowserRouter(buildRoutes(), { basename: import.meta.env.BASE_URL });
export const createTestRouter = (initial: string, routes = buildRoutes()) =>
  createMemoryRouter(routes, { initialEntries: [initial] });
