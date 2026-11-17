import { expect, test } from '@playwright/test';

test('descarga, rechaza enums inválidos e importa una copia válida', async ({ page }) => {
  const erroresPagina = [];
  page.on('pageerror', (error) => erroresPagina.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Cambiar a registro' }).click();
  await page.getByLabel('Nombre').fill('Copia E2E');
  await page.getByLabel('Correo electrónico').fill(`copia-${Date.now()}@vilai.test`);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('copia-partida-123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Tu aldea despierta')).toBeVisible();
  await page.getByRole('button', { name: 'Saltar' }).click();
  await page.getByRole('button', { name: 'Abrir ajustes' }).click();

  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar partida' }).click();
  const archivoDescargado = await descarga;
  expect(archivoDescargado.suggestedFilename()).toBe('vilai-partida.json');
  const archivoLocal = await archivoDescargado.path();
  const jsonValido = await (await import('node:fs/promises')).readFile(archivoLocal, 'utf8');
  const partidaInvalida = JSON.parse(jsonValido);
  partidaInvalida.aldea.aldeanos[0].estado = 'estado-inventado';

  let selector = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar partida JSON' }).click();
  await (await selector).setFiles({
    name: 'partida-invalida.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(partidaInvalida)),
  });
  await expect(page.getByRole('alert')).toContainText('aldeano 1');
  await expect(page.getByRole('alert')).toContainText('no es válido');

  selector = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar partida JSON' }).click();
  await (await selector).setFiles({
    name: 'vilai-partida.json',
    mimeType: 'application/json',
    buffer: Buffer.from(jsonValido),
  });
  await expect(page.getByText('Esto reemplaza tu aldea actual.')).toBeVisible();
  const importacion = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && new URL(response.url()).pathname.endsWith('/api/aldea/importar')
  ));
  await page.getByRole('button', { name: 'Reemplazar aldea' }).click();
  expect((await importacion).status()).toBe(200);
  await expect(page.getByText(/Partida importada\. Esta aldea queda marcada como demo/)).toBeVisible();
  expect(erroresPagina).toEqual([]);
});
