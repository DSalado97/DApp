import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { issueTestKey } from './test-key';

// Fuerza el método de exportación por descarga (el selector de archivos nativo no es automatizable).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
});

const profileId = async (page: Page) => (await page.getByTestId('profile-id').first().textContent())!.trim();

test('crear perfil → reabrir → importar llave → Modo DJ → exportar → borrar → reimportar', async ({ page }) => {
  // Crear perfil
  await page.goto('/');
  await expect(page.getByText('Crea tu perfil')).toBeVisible();
  await page.getByLabel('Nombre del perfil').fill('Ana');
  await page.getByRole('button', { name: 'Crear perfil' }).click();
  await expect(page.getByText('Bienvenido, Ana')).toBeVisible();

  // Cerrar y reabrir: el perfil persiste
  await page.reload();
  await expect(page.getByText('Bienvenido, Ana')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Modo DJ' })).toHaveCount(0);

  // Perfil: copiar el ID
  await page.getByRole('link', { name: 'Ana', exact: true }).click();
  const id = await profileId(page);
  expect(id).toMatch(/^[0-9a-f]{32}$/);

  // Una llave de otro perfil se rechaza; la correcta se instala
  await page.getByLabel('Importar llave').setInputFiles({ name: 'ajena.dagekey', mimeType: 'application/octet-stream', buffer: issueTestKey('otro-perfil') });
  await expect(page.getByRole('alert')).toContainText('otro perfil');
  await expect(page.getByRole('link', { name: 'Modo DJ' })).toHaveCount(0);
  await page.getByLabel('Importar llave').setInputFiles({ name: 'ana.dagekey', mimeType: 'application/octet-stream', buffer: issueTestKey(id) });
  await expect(page.getByText('Llave instalada.')).toBeVisible();

  // Modo DJ, y sigue disponible tras recargar (la credencial se revalida al arrancar)
  await page.getByRole('link', { name: 'Modo DJ' }).click();
  await expect(page.getByText('Panel del DJ')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Panel del DJ')).toBeVisible();

  // Exportar el perfil
  await page.getByRole('link', { name: 'Ana', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar perfil (.dageprofile)' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^ana-.*\.dageprofile$/);
  const exported = readFileSync((await download.path())!);
  await expect(page.getByText(/Copia descargada/)).toBeVisible();

  // Borrar el perfil
  await page.getByRole('button', { name: 'Borrar este perfil' }).click();
  await page.getByRole('button', { name: 'Borrar definitivamente' }).click();
  await expect(page.getByText('Crea tu perfil')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Crea tu perfil')).toBeVisible();

  // Reimportar el archivo: vuelve el mismo perfil con su llave
  await page.getByLabel('Importar perfil desde archivo').setInputFiles({ name: 'ana.dageprofile', mimeType: 'application/octet-stream', buffer: exported });
  await expect(page.getByText('Perfil «Ana»')).toBeVisible();
  await page.getByRole('button', { name: 'Importar perfil', exact: true }).click();
  await expect(page.getByText('Bienvenido, Ana')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Modo DJ' })).toBeVisible();
  await page.getByRole('link', { name: 'Ana', exact: true }).click();
  expect(await profileId(page)).toBe(id);
});

test('una llave caducada no da acceso al Modo DJ', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Nombre del perfil').fill('Beto');
  await page.getByRole('button', { name: 'Crear perfil' }).click();
  await page.getByRole('link', { name: 'Beto', exact: true }).click();
  const id = await profileId(page);
  await page.getByLabel('Importar llave').setInputFiles({
    name: 'vieja.dagekey',
    mimeType: 'application/octet-stream',
    buffer: issueTestKey(id, { expiresAt: '2020-01-01T00:00:00Z' }),
  });
  await expect(page.getByRole('alert')).toContainText('caducado');
  await page.goto('/dm');
  await expect(page.getByText('Modo DJ bloqueado')).toBeVisible();
});

test('el layout cabe en el viewport móvil y los objetivos táctiles miden al menos 44 px', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Nombre del perfil').fill('Cleo');
  await page.getByRole('button', { name: 'Crear perfil' }).click();
  await page.getByRole('link', { name: 'Cleo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu perfil' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, a, input:not([hidden])')]
      .filter((el) => el.offsetParent !== null && !(el instanceof HTMLInputElement && el.type === 'file'))
      .map((el) => ({ text: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30), h: Math.round(el.getBoundingClientRect().height) }))
      .filter((x) => x.h < 44 && x.h > 0),
  );
  // Los enlaces dentro de párrafos son texto corrido; solo se exigen controles propios.
  expect(small.filter((x) => !['Ajustes', 'Ir a Perfil'].includes(x.text))).toEqual([]);
});
