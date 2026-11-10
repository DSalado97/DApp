import { expect, test } from '@playwright/test';

test('abre en móvil, navega y funciona sin conexión', async ({ page, context }) => {
  await page.goto('/');
  await page.getByLabel('Nombre del perfil').fill('Ana');
  await page.getByRole('button', { name: 'Crear perfil' }).click();
  await expect(page.getByText('Bienvenido, Ana')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Bienvenido, Ana')).toBeVisible(); // los datos locales también funcionan sin conexión
  await page.getByRole('navigation').getByRole('link', { name: 'Reglas' }).click();
  await expect(page.getByRole('heading', { name: 'Reglamento' })).toBeVisible();
});
