import type { FeatureManifest } from '@/core/modules';
import { CompendiumPage, CompendiumRecordPage } from './pages';

/**
 * Compendio del DJ (permiso `dm.compendium`): contenido de audiencia «DJ» más el reglamento del jugador.
 * Los datos del DJ llegan en un chunk diferido que solo se descarga al abrir estas pantallas.
 */
export const compendiumManifest: FeatureManifest = {
  id: 'compendium',
  routes: [
    { path: 'compendio', Component: CompendiumPage },
    { path: 'compendio/:kind/:id', Component: CompendiumRecordPage },
  ],
  nav: { label: 'Compendio', to: 'compendio' },
  requiredPermission: 'dm.compendium',
  ownedStores: [],
  migrations: [],
};
