import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Límites entre capas (ver docs/ARCHITECTURE.md).
 * Se aplican tanto a alias (`@/capa`) como a rutas relativas (`../capa/...`).
 */
const layer = (name) => [`@/${name}`, `@/${name}/**`, `**/${name}/**`];
const forbid = (message, ...names) => ({
  patterns: names.map((n) => ({ group: layer(n), message })),
});

const DEXIE = {
  name: 'dexie',
  message: 'Dexie solo puede importarse desde src/data. Usa repositorios o servicios.',
};

const boundary = (files, restricted) => ({
  files,
  rules: { 'no-restricted-imports': ['error', restricted] },
});

export default tseslint.config(
  { ignores: ['dist', 'dist-e2e', 'dev-dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**', 'tools/**', 'e2e/**'],
    languageOptions: { globals: { ...globals.node } },
  },

  // rules: motor puro. No importa nada del proyecto salvo tipos de dominio.
  boundary(['src/rules/**'], {
    paths: [DEXIE, { name: 'react', message: 'rules/ no puede depender de React.' }],
    patterns: [
      ...['app', 'core', 'data', 'features', 'ui'].map((n) => ({
        group: layer(n),
        message: 'rules/ no importa nada del proyecto salvo tipos de dominio.',
      })),
      { group: ['@/content', '@/content/**', '**/content/**'], allowTypeImports: true, message: 'rules/ solo puede importar tipos de dominio.' },
    ],
  }),

  // ui: componentes sin conocimiento de features.
  boundary(['src/ui/**'], {
    paths: [DEXIE],
    ...forbid('ui/ no conoce features, app ni data.', 'features', 'app', 'data'),
  }),

  // features: repositorios y servicios, nunca Dexie; otras features solo por su index.ts.
  boundary(['src/features/**'], {
    paths: [DEXIE],
    patterns: [
      { group: ['@/features/*/*', '**/features/*/*'], message: 'Importa otras features solo a través de su index.ts.' },
      { group: layer('app'), message: 'features/ no importa de app/.' },
      { group: ['@/data/db', '@/data/db/**', '**/data/db', '**/data/db/**'], message: 'Las features usan repositorios, no la base de datos.' },
    ],
  }),

  // core: servicios transversales, sin features ni app.
  boundary(['src/core/**'], {
    paths: [DEXIE],
    ...forbid('core/ no importa de features ni de app.', 'features', 'app'),
  }),

  // content: datos estáticos.
  boundary(['src/content/**'], {
    paths: [DEXIE],
    ...forbid('content/ solo contiene datos y esquemas.', 'features', 'app', 'data', 'ui', 'core'),
  }),

  // app: puede usar todo salvo Dexie directo.
  boundary(['src/app/**'], { paths: [DEXIE] }),

  // data: sin features, ui ni app.
  boundary(['src/data/**'], forbid('data/ no importa de features, ui ni app.', 'features', 'ui', 'app')),

  // Los tests de lint necesitan escribir ejemplos prohibidos como texto; no son importaciones reales.
  { files: ['src/**/*.test.{ts,tsx}'], rules: { 'no-restricted-imports': 'off' } },
);
