import { hydraulicStep, initialHydraulics, STEP, type Controls, type HydraulicState } from "./physics";
import { feedAt, type Mission } from "./missions";

export type Phase = "ready" | "running" | "paused" | "won" | "lost" | "finished";
export interface Sample { time: number; heights: number[] }
export interface GameState {
  phase: Phase;
  time: number;
  hydraulics: HydraulicState;
  outside: number[];
  safeTime: number;
  history: Sample[];
  reason: string;
}

export function createGame(mission: Mission): GameState {
  return { phase: "ready", time: 0, hydraulics: initialHydraulics(mission.tanks), outside: [0, 0, 0], safeTime: 0, history: [{ time: 0, heights: mission.tanks.map(t => t.initialHeight) }], reason: "" };
}

export function stepGame(mission: Mission, game: GameState, controls: Controls): GameState {
  if (game.phase !== "running") return game;
  const dt = Math.min(STEP, mission.duration - game.time);
  const hydraulics = hydraulicStep(mission.tanks, game.hydraulics, controls, feedAt(mission, game.time, controls), dt);
  const time = Math.min(mission.duration, game.time + dt);
  const heights = hydraulics.volumes.map((v, i) => v / mission.tanks[i].area);
  const safe = heights.map(h => h >= mission.safe[0] && h <= mission.safe[1]);
  const outside = safe.map((ok, i) => ok ? 0 : game.outside[i] + dt);
  const safeTime = game.safeTime + (safe.every(Boolean) ? dt : 0);
  let phase: Phase = "running";
  let reason = "";
  if (!mission.laboratory) {
    const failed = outside.findIndex(t => t >= 4 - 1e-8);
    if (hydraulics.spilled > 1e-9) {
      phase = "lost";
      reason = `Derrame de ${(hydraulics.spilled * 1000).toFixed(2)} L a los ${time.toFixed(1)} s. El agua superó la capacidad de un tanque.`;
    } else if (failed >= 0) {
      phase = "lost";
      reason = `El tanque ${failed + 1} permaneció 4 s fuera del rango ${mission.safe[0].toFixed(2)}–${mission.safe[1].toFixed(2)} m. Su altura final fue ${heights[failed].toFixed(3)} m.`;
    }
  }
  if (phase === "running" && time >= mission.duration - 1e-8) {
    phase = mission.laboratory ? "finished" : "won";
    reason = mission.laboratory ? "Experimento de 300 s completado. Reinicia para seguir explorando." : `${mission.duration} s completados sin derrames ni salir del rango durante 4 s seguidos. Los tres tanques estuvieron simultáneamente en rango ${safeTime.toFixed(1)} s.`;
  }
  const sampleDue = time - game.history.at(-1)!.time >= 0.25 - 1e-8 || phase !== "running";
  return { phase, time, hydraulics, outside, safeTime, history: sampleDue ? [...game.history, { time, heights }] : game.history, reason };
}

export const scoreOf = (game: GameState, mission: Mission) => Math.round(game.safeTime / mission.duration * 1000);

export const RECORD_KEY = "torricelli-records-v1";
export interface Best { score: number; safeTime: number }
export type Records = Record<string, Best>;

export function readRecords(raw: string | null): Records {
  try {
    const data: unknown = JSON.parse(raw ?? "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter(([id, value]) =>
      ["equilibrio", "domino", "pulso"].includes(id) && value && typeof value === "object" &&
      typeof value.score === "number" && Number.isFinite(value.score) && value.score >= 0 && value.score <= 1000 &&
      typeof value.safeTime === "number" && Number.isFinite(value.safeTime) && value.safeTime >= 0 && value.safeTime <= 60));
  } catch { return {}; }
}
