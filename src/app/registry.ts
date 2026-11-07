import { validateManifests, type FeatureManifest } from '@/core/modules';
import { exampleManifest } from '@/features/example';

/**
 * Registro de módulos. Añadir una feature = importar su manifiesto aquí.
 * Es el único punto de la aplicación que conoce la lista de features.
 */
export const manifests: readonly FeatureManifest[] = [exampleManifest];

validateManifests(manifests);
