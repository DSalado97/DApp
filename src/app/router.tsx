import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom';
import type { FeatureManifest } from '@/core/modules';
import { manifests } from './registry';
import { DmGate, DmHome, RequirePermission } from './DmPages';
import { HomePage } from './HomePage';
import { ModeLayout, type NavEntry } from './ModeLayout';
import { NotFoundPage } from './NotFoundPage';
import { ProfilePage } from './ProfilePage';
import { SessionGate } from './SessionGate';
import { SettingsPage } from './SettingsPage';

export type Mode = 'player' | 'dm';

/** Un módulo sin permiso requerido pertenece al Modo Jugador; con permiso, al Modo DJ. */
export function modulesForMode(all: readonly FeatureManifest[], mode: Mode) {
  return all.filter((m) => (mode === 'player' ? m.requiredPermission === null : m.requiredPermission !== null));
}

export function navFor(mods: readonly FeatureManifest[], prefix: string): NavEntry[] {
  return mods.flatMap((m) =>
    m.nav ? [{ label: m.nav.label, to: `${prefix}${m.nav.to}`, permission: m.requiredPermission }] : [],
  );
}

/**
 * Las rutas del DJ existen siempre pero están protegidas: `/dm` exige una llave válida (DmGate) y cada ruta
 * declara su permiso (RequirePermission). Los permisos se leen al renderizar, así que cambiar de perfil
 * o quitar la llave los revoca sin recargar.
 */
export function buildRoutes(all: readonly FeatureManifest[] = manifests): RouteObject[] {
  const player = modulesForMode(all, 'player');
  const dm = modulesForMode(all, 'dm');

  const routes: RouteObject[] = [
    {
      path: '/',
      element: <ModeLayout mode="player" nav={navFor(player, '/')} />,
      children: [
        { index: true, element: <HomePage nav={navFor(player, '/')} /> },
        { path: 'perfil', element: <ProfilePage /> },
        { path: 'ajustes', element: <SettingsPage /> },
        ...player.flatMap((m) => m.routes.map((r) => ({ path: r.path, element: <r.Component /> }))),
      ],
    },
    {
      path: '/dm',
      element: (
        <DmGate>
          <ModeLayout mode="dm" nav={navFor(dm, '/dm/')} />
        </DmGate>
      ),
      children: [
        { index: true, element: <DmHome /> },
        ...dm.flatMap((m) =>
          m.routes.map((r) => ({
            path: r.path,
            element: (
              <RequirePermission permission={m.requiredPermission!}>
                <r.Component />
              </RequirePermission>
            ),
          })),
        ),
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ];
  // Todo cuelga de SessionGate: sin base de datos o sin perfil no se monta ninguna pantalla de la app.
  return [{ element: <SessionGate />, children: routes }];
}

export const createAppRouter = () => createBrowserRouter(buildRoutes(), { basename: import.meta.env.BASE_URL });
export const createTestRouter = (initial: string, routes = buildRoutes()) =>
  createMemoryRouter(routes, { initialEntries: [initial] });
