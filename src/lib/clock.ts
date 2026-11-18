import { STEP } from "./physics";

// Background gaps and long stalls are discarded, never added to the experiment.
export class SimulationClock {
  private previous: number | null = null;
  private accumulator = 0;

  reset() { this.previous = null; this.accumulator = 0; }

  tick(nowMs: number, active: boolean, step: () => void) {
    if (!active) { this.reset(); return; }
    if (this.previous === null) { this.previous = nowMs; return; }
    const elapsed = Math.max(0, (nowMs - this.previous) / 1000);
    this.previous = nowMs;
    if (elapsed > 0.25) { this.accumulator = 0; return; }
    this.accumulator += elapsed;
    while (this.accumulator >= STEP) {
      step();
      this.accumulator -= STEP;
    }
  }
}
