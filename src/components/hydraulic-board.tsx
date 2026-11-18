import { flows, type Controls } from "@/lib/physics";
import type { GameState } from "@/lib/game";
import { feedAt, type Mission } from "@/lib/missions";
import { TANK_COLORS } from "./history-chart";

const POSITIONS = [{ x: 125, y: 48 }, { x: 422, y: 218 }, { x: 720, y: 388 }];
const WIDTH = 174;
const HEIGHT = 150;

export default function HydraulicBoard({ mission, game, controls, selected, onSelect }: { mission: Mission; game: GameState; controls: Controls; selected: number; onSelect: (i: number) => void }) {
  const feed = feedAt(mission, game.time, controls);
  const { outgoing } = flows(mission.tanks, game.hydraulics, controls, feed);
  const moving = game.phase === "running";
  return <div className="hydraulic-board" data-testid="hydraulic-board">
    <svg viewBox="0 0 1000 590" role="group" aria-label="Tablero hidráulico: selecciona un tanque para ver su matemática">
      <defs>
        <linearGradient id="water" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#39bdf0" stopOpacity=".64" /><stop offset="1" stopColor="#146285" stopOpacity=".35" /></linearGradient>
        <linearGradient id="glass"><stop stopColor="#a8e8ed" stopOpacity=".08" /><stop offset=".4" stopColor="#a8e8ed" stopOpacity=".01" /><stop offset="1" stopColor="#a8e8ed" stopOpacity=".1" /></linearGradient>
        <pattern id="board-grid" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#2a4448" /></pattern>
        <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#65cff2" /></marker>
      </defs>
      <rect width="1000" height="590" fill="url(#board-grid)" />
      <g className="board-annotation"><text x="35" y="32">ENTRADA EXTERNA</text><text x="35" y="55" fill="#66d7fc" fontSize="19">{(feed * 1000).toFixed(2)} L/s</text></g>
      <path d="M 35 77 H 88 Q 100 77 100 90 V 117 Q 100 129 112 129 H 125" className="pipe" />
      <path d="M 35 77 H 88 Q 100 77 100 90 V 117 Q 100 129 112 129 H 125" className={`pipe-water ${moving && feed > 0 ? "flowing" : ""}`} style={{ opacity: feed > 0 ? 1 : 0.15 }} />
      <path d="M 68 77 H 90" stroke="#65cff2" strokeWidth="2" markerEnd="url(#flow-arrow)" />
      {POSITIONS.map(({ x, y }, i) => {
        const tank = mission.tanks[i];
        const height = game.hydraulics.volumes[i] / tank.area;
        const surface = y + HEIGHT - height / tank.maxHeight * HEIGHT;
        const safeTop = y + HEIGHT - mission.safe[1] / tank.maxHeight * HEIGHT;
        const safeBottom = y + HEIGHT - mission.safe[0] / tank.maxHeight * HEIGHT;
        const warning = height < mission.safe[0] || height > mission.safe[1];
        const next = POSITIONS[i + 1];
        const pipe = next ? `M ${x + WIDTH} ${y + HEIGHT - 6} H ${next.x + WIDTH / 2 - 15} Q ${next.x + WIDTH / 2} ${y + HEIGHT - 6} ${next.x + WIDTH / 2} ${y + HEIGHT + 9} V ${next.y - 2}` : `M ${x + WIDTH} ${y + HEIGHT - 6} H 943 Q 958 ${y + HEIGHT - 6} 958 ${y + HEIGHT + 9} V 567`;
        return <g key={i}>
          <path d={pipe} className="pipe" /><path d={pipe} className={`pipe-water ${moving && outgoing[i] > 0 ? "flowing" : ""}`} style={{ opacity: outgoing[i] > 0 ? 1 : 0.12 }} />
          <path d={`M ${x + WIDTH + 66} ${y + HEIGHT - 6} h 22`} stroke="#65cff2" strokeWidth="2" markerEnd="url(#flow-arrow)" />
          <g role="button" tabIndex={0} aria-label={`Seleccionar tanque ${i + 1}, altura ${height.toFixed(3)} metros`} aria-pressed={selected === i} onClick={() => onSelect(i)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(i); } }} className="tank-hit">
            <rect x={x - 10} y={y - 15} width={WIDTH + 20} height={HEIGHT + 30} rx="9" fill="transparent" stroke={selected === i ? "#80dac5" : "transparent"} strokeDasharray="4 6" />
            <rect x={x} y={y} width={WIDTH} height={HEIGHT} rx="5" fill="url(#glass)" stroke="#547279" strokeWidth="2" />
            <rect x={x + 2} y={surface} width={WIDTH - 4} height={Math.max(0, y + HEIGHT - surface - 1)} fill="url(#water)" />
            <rect x={x + 2} y={safeTop} width={WIDTH - 4} height={safeBottom - safeTop} fill="#9ddc9b" fillOpacity=".07" />
            <line x1={x} x2={x + WIDTH} y1={safeTop} y2={safeTop} stroke="#b0daa6" strokeDasharray="5 4" opacity=".85" />
            <line x1={x} x2={x + WIDTH} y1={safeBottom} y2={safeBottom} stroke="#b0daa6" strokeDasharray="5 4" opacity=".85" />
            <line x1={x + 2} x2={x + WIDTH - 2} y1={surface} y2={surface} stroke="#76e0ff" strokeWidth="2.5" />
            {[0, 0.35, 0.7, 1.05, 1.4].map(h => <g key={h}><line x1={x + WIDTH - 12} x2={x + WIDTH} y1={y + HEIGHT - h / 1.4 * HEIGHT} y2={y + HEIGHT - h / 1.4 * HEIGHT} stroke="#9cb0b3" /><text x={x + WIDTH + 7} y={y + HEIGHT - h / 1.4 * HEIGHT + 4} className="tank-scale">{h.toFixed(2)}</text></g>)}
            <text x={x + 13} y={y + 25} fill={TANK_COLORS[i]} fontSize="14" fontWeight="700" letterSpacing="2">TANQUE 0{i + 1}</text>
            <text x={x + 13} y={y + 63} fill="#eff9f8" fontSize="32" fontWeight="600">{height.toFixed(2)}<tspan fontSize="16" fill="#b0c8cc"> m</tspan></text>
            <text x={x + 13} y={y + 85} fill={warning ? "#ffcd7e" : "#c5e6c1"} fontSize="13">{warning ? "⚠ FUERA DE RANGO" : "✓ EN RANGO SEGURO"}</text>
            <rect x={x - 5} y={y + HEIGHT} width={WIDTH + 10} height="7" rx="2" fill="#5c7276" />
            <path d={`M ${x + 12} ${y + HEIGHT + 7} v 10 M ${x + WIDTH - 12} ${y + HEIGHT + 7} v 10`} stroke="#556e73" strokeWidth="4" />
          </g>
          <g transform={`translate(${x + WIDTH + 35},${y + HEIGHT - 6})`}>
            <circle r="15" fill="#152b2d" stroke={controls.openings[i] === 0 ? "#f1b96e" : "#8cd2bc"} strokeWidth="2" />
            <path d="M -10 0 H 10 M 0 -10 V 10" stroke="#9fd9c6" strokeWidth="2" transform={`rotate(${controls.openings[i] * 1.8})`} />
          </g>
          <text x={x + WIDTH + 20} y={y + HEIGHT + 29} className="board-annotation" fill="#bdd5d9">V{i + 1} · {controls.openings[i]}%</text>
          <text x={x + WIDTH + 20} y={y + HEIGHT + 49} className="board-annotation">{(outgoing[i] * 1000).toFixed(2)} L/s →</text>
        </g>;
      })}
      <g className="board-annotation"><text x="44" y="456" fill="#a6c999">┄ RANGO SEGURO</text><text x="44" y="481">{mission.safe[0].toFixed(2)}–{mission.safe[1].toFixed(2)} m</text><text x="44" y="517">Selecciona un tanque</text><text x="44" y="537">para explorar su ecuación.</text><text x="750" y="580">DESAGÜE →</text></g>
      <g opacity=".45"><path d="M 325 40 H 940 M 325 47 H 900" stroke="#2f484c" /><text x="940" y="32" textAnchor="end" className="board-annotation">CIRCUITO POR GRAVEDAD / TC–03</text></g>
    </svg>
  </div>;
}
