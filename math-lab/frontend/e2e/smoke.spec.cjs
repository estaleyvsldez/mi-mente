// Prueba de humo en navegador real: recorre las pantallas principales y
// resuelve un ejercicio (con y sin ayuda). Requiere el servidor en :8000.
const { test, expect } = require("@playwright/test");
const BASE = process.env.MATHLAB_URL || "http://127.0.0.1:8000";

test.beforeAll(async ({ request }) => {
  await request.put(`${BASE}/api/settings`, { data: { explorer: true } });
});

test("las pantallas principales cargan sin errores", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/", "/mapa", "/biblioteca", "/practica", "/desafio", "/repaso", "/examenes", "/errores", "/estadisticas", "/logros", "/glosario", "/ajustes", "/bloque/mat01.b04", "/tema/mat01.b04.t05"]) {
    await page.goto(BASE + path);
    await expect(page.locator("h1").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("el mapa muestra los 32 bloques", async ({ page }) => {
  await page.goto(BASE + "/mapa");
  await expect(page.getByText(/^Mundo \d\d/)).toHaveCount(32);
});

test("resolver un ejercicio: error diagnosticado y modo ayuda", async ({ page }) => {
  await page.goto(BASE + "/practica?tema=mat01.b04.t05");
  await page.getByText("No sé / Ayuda").click();
  await expect(page.getByText(/Modo Ayuda/)).toBeVisible();
  await page.getByLabel("Tu respuesta").fill("1");
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(page.getByText("✗ Incorrecto")).toBeVisible();
  await expect(page.getByText(/Procedimiento:/).first()).toBeVisible();
});

test("móvil sin desbordamiento horizontal", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  for (const path of ["/", "/mapa", "/practica?tema=mat01.b09.t07", "/tema/mat01.b04.t05"]) {
    await page.goto(BASE + path);
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
