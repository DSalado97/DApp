import { expect, test, type Page } from '@playwright/test';
import { issueTestKey } from './test-key';

const createProfile = async (page: Page) => {
  await page.goto('/');
  await page.getByLabel('Nombre del perfil').fill('Ana');
  await page.getByRole('button', { name: 'Crear perfil' }).click();
  await expect(page.getByText('Bienvenido, Ana')).toBeVisible();
};

test('reglamento, dados y compendio del DJ en viewport móvil', async ({ page }) => {
  await createProfile(page);

  // Reglamento: buscar un hechizo y abrir su ficha
  await page.getByRole('navigation').getByRole('link', { name: 'Reglas' }).click();
  await page.getByLabel('Buscar').fill('virote');
  await page.getByRole('link', { name: /Virote Arcano/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Virote Arcano' })).toBeVisible();
  await expect(page.getByText('NO de lanzamiento')).toBeVisible();

  // Un jugador no encuentra contenido del DJ
  await page.getByRole('link', { name: /Volver al reglamento/ }).click();
  await page.getByLabel('Buscar').fill('Hurlock');
  await expect(page.getByText(/Sin resultados/)).toBeVisible();

  // Sin horizontal scroll a 375 px de ancho en el reglamento
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  // Dados: una tirada de atributo con NO
  await page.getByRole('navigation').getByRole('link', { name: 'Dados' }).click();
  await page.getByRole('button', { name: 'Tirar 3d6' }).click();
  await expect(page.getByText(/^(Éxito|Fallo):/)).toBeVisible();
  await page.getByRole('button', { name: 'Dados' }).click();
  await page.getByRole('button', { name: '2d6' }).click();
  await expect(page.getByText('2d6', { exact: true }).first()).toBeVisible();

  // El DJ: con la llave se abre el compendio y aparece el bestiario
  await page.getByRole('link', { name: 'Ana', exact: true }).click();
  const id = (await page.getByTestId('profile-id').first().textContent())!.trim();
  await page.getByLabel('Importar llave').setInputFiles({ name: 'ana.dagekey', mimeType: 'application/octet-stream', buffer: issueTestKey(id) });
  await expect(page.getByText('Llave instalada.')).toBeVisible();
  await page.getByRole('link', { name: 'Modo DJ' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Compendio' }).click();
  await page.getByLabel('Buscar').fill('hurlock');
  await page.getByRole('link', { name: /^Hurlock/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Hurlock' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Espada a dos manos' })).toBeVisible();
});
