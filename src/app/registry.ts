import { validateManifests, type FeatureManifest } from '@/core/modules';
import { compendiumManifest } from '@/features/compendium';
import { diceManifest } from '@/features/dice';
import { rulebookManifest } from '@/features/rulebook';
import { dataConfigFor } from '@/data/stores';

/**
 * Registro de módulos. Añadir una feature = importar su manifiesto aquí.
 * Es el único punto de la aplicación que conoce la lista de features.
 */
export const manifests: readonly FeatureManifest[] = [rulebookManifest, diceManifest, compendiumManifest];

validateManifests(manifests);

/** Tablas y migraciones de todos los módulos: alimentan el registro de stores (exportar, importar, borrar en cascada). */
export const dataConfig = dataConfigFor(manifests);
