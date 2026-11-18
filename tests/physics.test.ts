import { describe, expect, it } from "vitest";
import { flows, G, hydraulicStep, initialHydraulics, outflow, STEP, type Tank } from "../src/lib/physics";
import { copyControls, LAB } from "../src/lib/missions";

describe("Ley de Torricelli", () => {
  it("una válvula cerrada tiene caudal exactamente cero", () => {
    expect(outflow(1.2, 40, 0)).toBe(0);
    expect(outflow(0, 40, 100)).toBe(0);
  });

  it("duplicar el diámetro cuadruplica el caudal a igual altura y apertura", () => {
    expect(outflow(0.8, 40, 73) / outflow(0.8, 20, 73)).toBeCloseTo(4, 12);
  });

  it("conserva agua en la cascada contabilizando entrada, desagüe y derrame", () => {
    const tanks = LAB.tanks;
    let state = initialHydraulics(tanks);
    const initial = state.volumes.reduce((a, b) => a + b, 0);
    const controls = copyControls(LAB);
    for (let step = 0; step < 120 * 180; step++) {
      controls.openings = step < 2400 ? [0, 0, 0] : [100, 60, 95];
      const external = step < 9000 ? 0.008 : 0;
      state = hydraulicStep(tanks, state, controls, external);
      const accounted = state.volumes.reduce((a, b) => a + b, 0) + state.drained + state.spilled;
      expect(Math.abs(accounted - initial - state.externalIn)).toBeLessThan(1e-10);
      state.volumes.forEach((v, i) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(tanks[i].area * tanks[i].maxHeight + 1e-14); });
    }
    expect(state.spilled).toBeGreaterThan(0);
    expect(state.drained).toBeGreaterThan(0);
  });

  it("contrasta todo el vaciado aislado con h(t) = max(0, √h₀ − kt/2)², tolerancia 0,2 mm", () => {
    const tank: Tank = { area: 0.09, maxHeight: 1.4, initialHeight: 1, cd: 0.62 };
    const controls = { openings: [100], diameters: [20], feed: 0 };
    let state = initialHydraulics([tank]);
    const k = tank.cd * Math.PI * (0.02 ** 2) / (4 * tank.area) * Math.sqrt(2 * G);
    let maxError = 0;
    for (let step = 1; step <= 120 * 250; step++) {
      state = hydraulicStep([tank], state, controls, 0);
      const analytic = Math.max(0, Math.sqrt(tank.initialHeight) - k * step * STEP / 2) ** 2;
      maxError = Math.max(maxError, Math.abs(state.volumes[0] / tank.area - analytic));
    }
    expect(maxError).toBeLessThan(0.0002);
    expect(state.volumes[0]).toBe(0);
    console.info(`Vaciado: error máximo ${maxError.toExponential(4)} m; tolerancia 2e-4 m.`);
  });

  it("el agua no atraviesa dos tanques durante el mismo paso y el flujo no supera el agua disponible", () => {
    const tanks = LAB.tanks.map(t => ({ ...t, initialHeight: 0 }));
    const controls = copyControls(LAB);
    const first = hydraulicStep(tanks, initialHydraulics(tanks), controls, 0.01);
    expect(first.volumes[0]).toBeGreaterThan(0);
    expect(first.volumes[1]).toBe(0);
    expect(first.volumes[2]).toBe(0);
    const second = hydraulicStep(tanks, first, controls, 0, 10);
    expect(second.volumes[0]).toBeGreaterThanOrEqual(0);
    expect(second.volumes[1]).toBeGreaterThan(0);
    expect(flows(tanks, first, controls, 0).incoming[1]).toBeGreaterThan(0);
  });
});
