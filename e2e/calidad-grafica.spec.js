import { expect, test } from '@playwright/test';

async function medirFps(page) {
  return page.evaluate(() => new Promise((resolver) => {
    let inicio;
    let fotogramas = 0;
    const siguienteFotograma = (tiempo) => {
      if (inicio === undefined) inicio = tiempo;
      fotogramas += 1;
      const duracion = tiempo - inicio;
      if (duracion >= 5000) {
        resolver(Math.round(((fotogramas - 1) * 1000) / duracion));
        return;
      }
      requestAnimationFrame(siguienteFotograma);
    };
    requestAnimationFrame(siguienteFotograma);
  }));
}

test('mide FPS en la escena web para cada calidad gráfica', async ({ page }) => {
  const correo = `calidad-${Date.now()}@vilai.test`;
  const erroresPagina = [];
  page.on('pageerror', (error) => erroresPagina.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Cambiar a registro' }).click();
  await page.getByLabel('Nombre').fill('Prueba calidad');
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('prueba-calidad-123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Tu aldea despierta')).toBeVisible();
  await page.getByRole('button', { name: 'Saltar' }).click();

  const resultados = {};
  for (const [nivel, etiqueta] of [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja'], ['auto', 'Auto']]) {
    await page.getByRole('button', { name: 'Abrir ajustes' }).click();
    await expect(page.getByText('Calidad gráfica', { exact: true })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: `Calidad gráfica ${etiqueta}` }).click();
    await page.goBack();
    await expect(page.locator('canvas').first()).toBeVisible();
    resultados[nivel] = await medirFps(page);
  }

  await page.getByRole('button', { name: 'Abrir ajustes' }).click();
  await expect(page.getByText(/^Última medición:/)).toBeVisible();
  console.log(`FPS observados en la escena web (5 s): ${JSON.stringify(resultados)}`);
  expect(Object.keys(resultados)).toHaveLength(4);
  expect(Object.values(resultados).every((fps) => Number.isFinite(fps) && fps > 0)).toBe(true);
  expect(erroresPagina).toEqual([]);
});
