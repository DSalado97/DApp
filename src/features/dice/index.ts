import type { FeatureManifest } from '@/core/modules';
import { DicePage } from './DicePage';

/** Lanzador de dados: tiradas de atributo (con dado dragón, dobles y PP), enfrentadas, avanzadas y dados sueltos. */
export const diceManifest: FeatureManifest = {
  id: 'dice',
  routes: [{ path: 'dados', Component: DicePage }],
  nav: { label: 'Dados', to: 'dados' },
  requiredPermission: null,
  ownedStores: [],
  migrations: [],
};
