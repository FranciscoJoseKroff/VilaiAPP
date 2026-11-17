import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('registra, inicia sesión, construye y conserva la aldea tras recargar', async ({ browser }) => {
  const correo = `playwright-${Date.now()}@vilai.test`;
  const contrasena = 'prueba-e2e-123';
  const errores = [];
  const vigilarPagina = (page) => {
    page.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        errores.push(`${response.request().method()} ${response.url()} respondió ${response.status()}`);
      }
    });
  };
  const registro = await browser.newPage();
  let sesion = null;

  try {
    vigilarPagina(registro);
    await registro.goto('/');
    await registro.getByRole('button', { name: 'Cambiar a registro' }).click();
    await registro.getByLabel('Nombre').fill('Prueba E2E');
    await registro.getByLabel('Correo electrónico').fill(correo);
    await registro.getByRole('textbox', { name: 'Contraseña' }).fill(contrasena);
    await registro.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(registro.getByText('Tu aldea despierta')).toBeVisible();
    await expect(registro.locator('canvas').first()).toBeVisible();
    await registro.getByRole('button', { name: 'Saltar' }).click();

    sesion = await browser.newPage();
    vigilarPagina(sesion);
    await sesion.goto('/');
    await sesion.getByLabel('Correo electrónico').fill(correo);
    await sesion.getByRole('textbox', { name: 'Contraseña' }).fill(contrasena);
    await sesion.getByRole('button', { name: 'Entrar' }).click();
    await expect(sesion.getByText('Tu aldea despierta')).toBeVisible();
    await expect(sesion.locator('canvas').first()).toBeVisible();
    await sesion.getByRole('button', { name: 'Saltar' }).click();

    await sesion.getByRole('tab', { name: 'Construir' }).click();
    const construirAserradero = sesion.getByRole('button', { name: 'Construir Aserradero' });
    await expect(construirAserradero).toBeEnabled();

    const guardadoConstruccion = sesion.waitForResponse((response) => {
      if (response.request().method() !== 'PUT' || !new URL(response.url()).pathname.endsWith('/api/aldea')) {
        return false;
      }
      const solicitud = response.request().postDataJSON();
      return solicitud.edificios?.some((edificio) => edificio.tipoId === 'aserradero');
    });
    await construirAserradero.click();
    const respuestaGuardado = await guardadoConstruccion;
    expect(respuestaGuardado.status()).toBe(200);
    await expect(sesion.getByText('Nv. 1')).toBeVisible();

    await sesion.reload();
    await expect(sesion.getByRole('tab', { name: 'Construir' })).toBeVisible();
    await sesion.getByRole('tab', { name: 'Construir' }).click();
    await expect(sesion.getByText('Nv. 1')).toBeVisible();

    await sesion.getByRole('tab', { name: / Aldea$/ }).click();
    await expect(sesion.getByText('Tu aldea despierta')).toBeVisible();
    await expect(sesion.locator('canvas').first()).toBeVisible();
    await expect(sesion.getByText(/Mientras no jugabas generaste:/)).toBeHidden({ timeout: 10_000 });
    const captura = path.resolve('docs', 'capturas-e2e', 'aldea.png');
    await mkdir(path.dirname(captura), { recursive: true });
    await sesion.screenshot({ path: captura, fullPage: true });
  } finally {
    await registro.close();
    await sesion?.close();
  }

  expect(errores, 'La prueba encontró errores HTTP o de página no controlados').toEqual([]);
});
