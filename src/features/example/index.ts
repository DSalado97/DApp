import type { FeatureManifest } from '@/core/modules';
import { ExamplePage } from './ExamplePage';

export const exampleManifest: FeatureManifest = {
  id: 'example',
  routes: [{ path: 'ejemplo', Component: ExamplePage }],
  nav: { label: 'Ejemplo', to: 'ejemplo' },
  requiredPermission: null,
  ownedStores: [],
  migrations: [],
};
