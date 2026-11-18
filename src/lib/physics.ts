export const G = 9.81;
export const STEP = 1 / 120;
export interface Tank { area: number; maxHeight: number; initialHeight: number; cd: number }
export interface Controls { openings: number[]; diameters: number[]; feed: number }
export interface HydraulicState { volumes: number[]; externalIn: number; drained: number; spilled: number }

export function outflow(height: number, diameterMm: number, openingPercent: number, cd = 0.62) {
  const area = Math.PI * (Math.max(0, diameterMm) / 1000) ** 2 / 4;
  return cd * area * Math.min(1, Math.max(0, openingPercent / 100)) * Math.sqrt(2 * G * Math.max(0, height));
}

export const initialHydraulics = (tanks: Tank[]): HydraulicState => ({
  volumes: tanks.map(t => t.area * t.initialHeight), externalIn: 0, drained: 0, spilled: 0,
});

export function flows(tanks: Tank[], state: HydraulicState, controls: Controls, external: number) {
  const outgoing = tanks.map((t, i) => outflow(state.volumes[i] / t.area, controls.diameters[i], controls.openings[i], t.cd));
  return { outgoing, incoming: outgoing.map((_, i) => i === 0 ? external : outgoing[i - 1]) };
}

export function hydraulicStep(tanks: Tank[], state: HydraulicState, controls: Controls, external: number, dt = STEP): HydraulicState {
  // All outlets use the old state; incoming water cannot cross two tanks in one step.
  const outgoing = flows(tanks, state, controls, external).outgoing.map((q, i) => Math.min(q * dt, state.volumes[i]));
  let spill = 0;
  const volumes = tanks.map((t, i) => {
    const v = state.volumes[i] - outgoing[i] + (i === 0 ? external * dt : outgoing[i - 1]);
    const excess = Math.max(0, v - t.area * t.maxHeight);
    spill += excess;
    return v - excess;
  });
  return { volumes, externalIn: state.externalIn + external * dt, drained: state.drained + outgoing.at(-1)!, spilled: state.spilled + spill };
}
