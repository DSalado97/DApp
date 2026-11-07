import { expect, test } from '@playwright/test';

test('abre en móvil, navega y funciona sin conexión', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByText('Bienvenido')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('navigation').getByRole('link', { name: 'Ejemplo' }).click();
  await expect(page.getByText('Módulo de ejemplo')).toBeVisible();
});
