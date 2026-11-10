import type { FeatureManifest } from '@/core/modules';
import { RulebookPage, RulebookRecordPage } from './pages';

export { SearchPanel, recordPath } from './SearchPanel';
export { RecordFrame, getPlayerIndex } from './pages';
export { renderPlayerRecord, renderDmRecord, CreatureSheet } from './RecordView';

/** Reglamento del jugador: búsqueda MiniSearch y fichas de todo el contenido de audiencia «jugador». */
export const rulebookManifest: FeatureManifest = {
  id: 'rulebook',
  routes: [
    { path: 'reglas', Component: RulebookPage },
    { path: 'reglas/:kind/:id', Component: RulebookRecordPage },
  ],
  nav: { label: 'Reglas', to: 'reglas' },
  requiredPermission: null,
  ownedStores: [],
  migrations: [],
};
