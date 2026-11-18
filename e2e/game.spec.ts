import { expect, test, type Page } from "@playwright/test";

async function slider(page: Page, label: string, value: number) {
  const range = page.getByRole("slider", { name: label, exact: true });
  await range.evaluate((element, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, String(next));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await expect(range).toHaveValue(String(value));
}
async function valves(page: Page, value: number) { for (let i = 1; i <= 3; i++) await slider(page, `Apertura válvula ${i}`, value); }
async function advance(page: Page, ms: number) { await page.clock.runFor(ms); }

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Iniciar simulación", exact: true })).toBeEnabled();
});

test("misión completa, pausa, matemática, récord persistente y siguiente misión", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("El profesor contra la física");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.screenshot({ path: `test-results/${test.info().project.name}-tablero.png`, fullPage: true });
  await valves(page, 84);
  await page.getByRole("button", { name: "Iniciar simulación", exact: true }).click();
  await advance(page, 5000);
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const paused = await page.getByTestId("timer").innerText();
  await advance(page, 10000);
  await expect(page.getByTestId("timer")).toHaveText(paused);
  await page.locator(".math-panel > summary").click();
  await page.getByRole("button", { name: "Tanque 2", exact: true }).click();
  await expect(page.locator(".math-body")).toContainText("dh/dt");
  await expect(page.locator(".derivative-status")).toContainText("equilibrio");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await advance(page, 36000);
  await expect(page.getByTestId("result")).toContainText("Equilibrio conseguido");
  await expect(page.getByTestId("result").getByRole("img")).toBeVisible();
  await expect(page.locator(".result-score")).toContainText("1000");
  await page.screenshot({ path: `test-results/${test.info().project.name}-victoria.png`, fullPage: true });
  await page.getByRole("button", { name: "Siguiente misión" }).click();
  await expect(page.locator(".briefing h2")).toHaveText("Efecto dominó");
  await valves(page, 88);
  await page.getByRole("button", { name: "Iniciar simulación", exact: true }).click();
  await advance(page, 51000);
  await expect(page.getByTestId("result")).toContainText("Equilibrio conseguido");
  await page.reload();
  await expect(page.locator(".mission-card").first()).toContainText("1000 / 1000");
  await expect(page.locator(".mission-card").nth(1)).toContainText("1000 / 1000");
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("laboratorio con teclado, cambio de diámetro, entrada cerrada y pestaña oculta", async ({ page }) => {
  const external: string[] = []; page.on("request", r => { if (!r.url().startsWith("http://127.0.0.1:4173")) external.push(r.url()); });
  await page.getByRole("button", { name: "Laboratorio", exact: true }).click();
  await expect(page.locator(".briefing h2")).toHaveText("Laboratorio libre");
  await page.getByRole("button", { name: "Cerrar entrada", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Entrada externa", exact: true })).toHaveValue("0");
  await page.getByRole("spinbutton", { name: "Diámetro tanque 1", exact: true }).fill("40");
  await slider(page, "Apertura válvula 1", 0);
  await page.locator(".math-panel > summary").click();
  await expect(page.locator(".math-body")).toContainText("0,000000 m³/s");
  const valve = page.getByRole("slider", { name: "Apertura válvula 1", exact: true });
  await valve.focus(); await valve.press("ArrowRight");
  await expect(valve).toHaveValue("1");
  await page.locator("h1").click(); await page.keyboard.press("2"); await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("slider", { name: "Apertura válvula 2", exact: true })).toHaveValue("70");
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible();
  await advance(page, 3000);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeVisible();
  const paused = await page.getByTestId("timer").innerText();
  await advance(page, 60000);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.getByTestId("timer")).toHaveText(paused);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await advance(page, 2000);
  await expect(page.getByTestId("timer")).not.toHaveText(paused);
  await page.screenshot({ path: `test-results/${test.info().project.name}-laboratorio.png`, fullPage: true });
  expect(external).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Reiniciar misión", exact: true }).click();
  await valves(page, 0);
  await slider(page, "Entrada externa", 5);
  await page.getByRole("button", { name: "Iniciar simulación", exact: true }).click();
  await advance(page, 13000);
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page.getByRole("button", { name: "Tanque 1", exact: true }).click();
  await expect(page.locator(".derivative-status")).toContainText("Nivel máximo");
  await expect(page.locator(".math-answer").last()).toHaveText("= 0,00000 m/s");
  await expect(page.locator(".math-note")).toContainText("Derrame: 5,000 L/s");
});

test("pulso de entrada: cambia a 18 y 38 s, secuencia ganadora de tres etapas", async ({ page }) => {
  await page.getByRole("button", { name: /03 Contra la corriente/ }).click();
  await valves(page, 48);
  await page.getByRole("button", { name: "Iniciar simulación", exact: true }).click();
  await advance(page, 18500);
  await expect(page.locator(".telemetry")).toContainText("3,40");
  await valves(page, 100);
  await advance(page, 20000);
  await expect(page.locator(".telemetry")).toContainText("1,10");
  await valves(page, 33);
  await advance(page, 23000);
  await expect(page.getByTestId("result")).toContainText("Equilibrio conseguido");
  await expect(page.locator(".result-score")).toContainText("1000");
});

test("una derrota explica el tanque y permite reiniciar", async ({ page }) => {
  await valves(page, 0);
  await page.getByRole("button", { name: "Iniciar simulación", exact: true }).click();
  await advance(page, 25000);
  await expect(page.getByTestId("result")).toContainText("Vuelve a intentarlo");
  await expect(page.locator(".result-reason")).toContainText("tanque 1 permaneció 4 s");
  await page.getByRole("button", { name: "Intentar de nuevo" }).click();
  await expect(page.getByRole("button", { name: "Iniciar simulación", exact: true })).toBeEnabled();
  await expect(page.getByTestId("timer")).toHaveText("00:40");
});

test("el tablero ampliado mantiene tanques y válvulas visibles en un proyector", async ({ page }, info) => {
  test.skip(info.project.name === "movil", "El modo de exposición está reservado a pantallas grandes");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("button", { name: "Ampliar tablero", exact: false }).click();
  await expect(page.getByTestId("hydraulic-board")).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("slider", { name: "Apertura válvula 3", exact: true })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: "test-results/proyector.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("se puede escribir el diámetro y el almacenamiento bloqueado no interrumpe el juego", async ({ page }) => {
  const diameter = page.getByRole("spinbutton", { name: "Diámetro tanque 1", exact: true });
  await diameter.fill(""); await diameter.pressSequentially("40");
  await expect(diameter).toHaveValue("40");
  await diameter.fill("99"); await diameter.blur();
  await expect(diameter).toHaveValue("40");
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("Storage blocked"); }; });
  await page.reload();
  await valves(page, 84);
  await page.getByRole("button", { name: "Iniciar simulación", exact: true }).click();
  await advance(page, 41000);
  await expect(page.getByTestId("result")).toContainText("Equilibrio conseguido");
  await expect(page.locator(".storage-notice")).toContainText("No se pudo guardar");
});
