import { describe, expect, it } from "vitest";
import { SimulationClock } from "../src/lib/clock";
import { createGame, readRecords, scoreOf, stepGame } from "../src/lib/game";
import { copyControls, feedAt, LAB, MISSIONS, REHEARSALS } from "../src/lib/missions";

describe("Misiones ensayadas con los controles del jugador", () => {
  for (const mission of MISSIONS) {
    it(`${mission.name}: secuencia ganadora reproducible, incluso con un segundo de reacción`, () => {
      for (const reaction of [0, 1]) {
        let game = { ...createGame(mission), phase: "running" as const } as ReturnType<typeof createGame>;
        const controls = copyControls(mission);
        let action = 0;
        let min = Infinity;
        let max = -Infinity;
        while (game.phase === "running") {
          const next = REHEARSALS[mission.id][action];
          if (next && game.time + 1e-8 >= next.at + (action === 0 ? 0 : reaction)) { controls.openings = [...next.openings]; action++; }
          game = stepGame(mission, game, controls);
          const heights = game.hydraulics.volumes.map((v, i) => v / mission.tanks[i].area);
          min = Math.min(min, ...heights); max = Math.max(max, ...heights);
        }
        expect(game.phase).toBe("won");
        expect(game.time).toBeCloseTo(mission.duration, 7);
        expect(game.hydraulics.spilled).toBe(0);
        expect(min).toBeGreaterThanOrEqual(mission.safe[0]);
        expect(max).toBeLessThanOrEqual(mission.safe[1]);
        expect(scoreOf(game, mission)).toBe(1000);
        console.info(`${mission.id}, reacción ${reaction}s: ${min.toFixed(4)}–${max.toFixed(4)} m; ${game.phase}; ${scoreOf(game, mission)} puntos.`);
      }
    });
  }

  it("sin regular las válvulas se pierde con un motivo concreto y se detiene la simulación", () => {
    const mission = MISSIONS[0];
    let game = createGame(mission);
    expect(stepGame(mission, game, copyControls(mission))).toBe(game);
    game = { ...game, phase: "running" };
    while (game.phase === "running") game = stepGame(mission, game, copyControls(mission));
    expect(game.phase).toBe("lost");
    expect(game.reason).toMatch(/tanque 1.*4 s/);
    expect(game.history.at(-1)!.time).toBe(game.time);
    expect(stepGame(mission, game, copyControls(mission))).toBe(game);
  });

  it("un derrame termina una misión inmediatamente; el laboratorio permite seguir", () => {
    for (const mission of [MISSIONS[0], LAB]) {
      let game = { ...createGame(mission), phase: "running" as const } as ReturnType<typeof createGame>;
      game.hydraulics.volumes[0] = mission.tanks[0].area * mission.tanks[0].maxHeight;
      const controls = copyControls(mission); controls.openings = [0, 0, 0];
      game = stepGame(mission, game, controls);
      expect(game.hydraulics.spilled).toBeGreaterThan(0);
      expect(game.phase).toBe(mission.laboratory ? "running" : "lost");
      if (!mission.laboratory) expect(game.reason).toMatch(/Derrame/);
    }
  });

  it("los eventos usan el tiempo de la simulación y respetan exactamente sus límites", () => {
    const mission = MISSIONS[2]; const controls = copyControls(mission);
    expect(feedAt(mission, 17.99, controls)).toBe(0.00165);
    expect(feedAt(mission, 18, controls)).toBe(0.0034);
    expect(feedAt(mission, 38, controls)).toBe(0.0011);
    let game = { ...createGame(mission), phase: "paused" as const } as ReturnType<typeof createGame>;
    game = stepGame(mission, game, controls);
    expect(game.time).toBe(0);
  });
});

describe("Reloj y almacenamiento", () => {
  it("pausas, pestañas ocultas y bloqueos largos no producen saltos", () => {
    const clock = new SimulationClock(); let steps = 0;
    const step = () => steps++;
    clock.tick(0, true, step); clock.tick(100, true, step);
    expect(steps).toBe(12);
    clock.tick(10000, false, step); clock.tick(20000, true, step);
    expect(steps).toBe(12);
    clock.tick(20100, true, step); expect(steps).toBe(24);
    clock.tick(40000, true, step); expect(steps).toBe(24);
    clock.tick(40100, true, step); expect(steps).toBe(36);
  });

  it("tolera JSON dañado y descarta marcas que no tienen sentido", () => {
    expect(readRecords("{broken")).toEqual({});
    expect(readRecords("null")).toEqual({});
    expect(readRecords('[{"score":12}]')).toEqual({});
    expect(readRecords(JSON.stringify({ equilibrio: { score: 1000, safeTime: 40 }, domino: { score: "1000", safeTime: 50 }, pulso: { score: 1001, safeTime: 60 }, unknown: { score: 3, safeTime: 1 } }))).toEqual({ equilibrio: { score: 1000, safeTime: 40 } });
  });
});
