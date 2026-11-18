import type { Controls, Tank } from "./physics";

export interface Mission {
  id: string;
  name: string;
  subtitle: string;
  briefing: string;
  duration: number;
  safe: [number, number];
  tanks: Tank[];
  controls: Controls;
  events: { at: number; feed: number; label: string }[];
  laboratory?: boolean;
}

const tanks = (heights: number[]): Tank[] => heights.map(initialHeight => ({ area: 0.09, maxHeight: 1.4, initialHeight, cd: 0.62 }));

export const MISSIONS: Mission[] = [
  {
    id: "equilibrio", name: "El primer equilibrio", subtitle: "01 / Aprende a regular",
    briefing: "Mantén los tres niveles entre 0,50 y 1,10 m durante 40 segundos. Abre las válvulas para igualar lo que entra y lo que sale.",
    duration: 40, safe: [0.5, 1.1], tanks: tanks([0.8, 0.8, 0.8]),
    controls: { openings: [35, 35, 35], diameters: [32, 32, 32], feed: 1.65 },
    events: [{ at: 0, feed: 1.65, label: "Entrada constante · encuentra el equilibrio" }],
  },
  {
    id: "domino", name: "Efecto dominó", subtitle: "02 / Conecta las piezas",
    briefing: "Los tanques empiezan a distintas alturas. Regula la cascada durante 50 segundos y mantén todos entre 0,45 y 1,15 m.",
    duration: 50, safe: [0.45, 1.15], tanks: tanks([0.95, 0.7, 0.55]),
    controls: { openings: [35, 35, 35], diameters: [36, 36, 36], feed: 2.2 },
    events: [{ at: 0, feed: 2.2, label: "Niveles desiguales · cada salida alimenta al siguiente tanque" }],
  },
  {
    id: "pulso", name: "Contra la corriente", subtitle: "03 / Reacciona al cambio",
    briefing: "Resiste 60 segundos entre 0,55 y 1,10 m. La entrada cambia a los 18 y 38 segundos. Anticipa el pulso y reajusta las tres válvulas.",
    duration: 60, safe: [0.55, 1.1], tanks: tanks([0.8, 0.8, 0.8]),
    controls: { openings: [30, 30, 30], diameters: [42, 42, 42], feed: 1.65 },
    events: [
      { at: 0, feed: 1.65, label: "Entrada estable · prepárate para el pulso" },
      { at: 18, feed: 3.4, label: "¡Pulso de entrada! Aumenta la apertura" },
      { at: 38, feed: 1.1, label: "La entrada disminuye · vuelve a regular" },
    ],
  },
];

export const LAB: Mission = {
  id: "laboratorio", name: "Laboratorio libre", subtitle: "SIN LÍMITES / Experimenta",
  briefing: "Experimenta sin perder. Cambia la entrada, el diámetro y las válvulas. Observa cómo responde la derivada; cierra la entrada para estudiar el vaciado.",
  duration: 300, safe: [0.5, 1.1], tanks: tanks([0.8, 0.8, 0.8]),
  controls: { openings: [65, 65, 65], diameters: [32, 32, 32], feed: 1.65 },
  events: [], laboratory: true,
};

export const copyControls = (mission: Mission): Controls => ({ ...mission.controls, openings: [...mission.controls.openings], diameters: [...mission.controls.diameters] });

export function feedAt(mission: Mission, time: number, controls: Controls) {
  return mission.laboratory ? controls.feed / 1000 : [...mission.events].reverse().find(e => e.at <= time + 1e-8)!.feed / 1000;
}

// A rehearsal is a list of ordinary slider values, applied on the simulation clock.
export const REHEARSALS: Record<string, { at: number; openings: number[] }[]> = {
  equilibrio: [{ at: 0, openings: [84, 84, 84] }],
  domino: [{ at: 0, openings: [88, 88, 88] }],
  pulso: [{ at: 0, openings: [48, 48, 48] }, { at: 18, openings: [100, 100, 100] }, { at: 38, openings: [33, 33, 33] }],
};
