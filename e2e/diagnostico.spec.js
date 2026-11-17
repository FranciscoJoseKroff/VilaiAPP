import { expect, test } from '@playwright/test';

test('un 400 de guardado no se confunde con desconexión ni entra en reintentos', async ({ page }) => {
  const erroresPagina = [];
  let rechazarGuardados = false;
  let guardadosRechazados = 0;
  page.on('pageerror', (error) => erroresPagina.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Cambiar a registro' }).click();
  await page.getByLabel('Nombre').fill('Diagnóstico');
  await page.getByLabel('Correo electrónico').fill(`diagnostico-${Date.now()}@vilai.test`);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('diagnostico-e2e-123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Tu aldea despierta')).toBeVisible();
  await page.getByRole('button', { name: 'Saltar' }).click();
  await page.route('**/api/aldea', async (route) => {
    if (rechazarGuardados && route.request().method() === 'PUT') {
      guardadosRechazados += 1;
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Datos de la aldea inválidos',
          detalle: 'aldeanos.0.estado tiene un valor no válido',
        }),
      });
      return;
    }
    await route.continue();
  });
  await page.getByRole('tab', { name: 'Construir' }).click();
  const respuesta400 = page.waitForResponse((response) => (
    response.request().method() === 'PUT'
    && new URL(response.url()).pathname.endsWith('/api/aldea')
    && response.status() === 400
  ));
  rechazarGuardados = true;
  await page.getByRole('button', { name: 'Construir Aserradero' }).click();
  await respuesta400;
  await page.waitForTimeout(11_000);
  expect(guardadosRechazados).toBe(1);

  await page.getByRole('button', { name: 'Abrir ajustes' }).click();
  await expect(page.getByText('Conexión: Conectado')).toBeVisible();
  await expect(page.getByText(/API 400: Datos de la aldea inválidos: aldeanos\.0\.estado tiene un valor no válido/)).toBeVisible();
  await expect(page.getByText('Sin conexión, reintentando...')).toBeHidden();
  expect(erroresPagina).toEqual([]);
});
