import type { Sample } from "@/lib/game";

export const TANK_COLORS = ["#54cdfa", "#a9dc86", "#d3b1ff"];

export default function HistoryChart({ history, duration, safe, id = "history" }: { history: Sample[]; duration: number; safe: [number, number]; id?: string }) {
  const x = (t: number) => 48 + t / duration * 700;
  const y = (h: number) => 170 - h / 1.4 * 144;
  return <div className="chart-wrap">
    <svg viewBox="0 0 780 210" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>Altura frente al tiempo de los tres tanques</title>
      <desc id={`${id}-desc`}>Eje horizontal de 0 a {duration} segundos, eje vertical de 0 a 1,4 metros. La banda sombreada indica el rango seguro de {safe[0]} a {safe[1]} metros.</desc>
      <rect x="48" y={y(safe[1])} width="700" height={y(safe[0]) - y(safe[1])} fill="#b8e0a2" opacity=".055" />
      {[0, 0.35, 0.7, 1.05, 1.4].map(h => <g key={h}><line x1="48" x2="748" y1={y(h)} y2={y(h)} stroke="#293b3f" strokeDasharray="3 5" /><text x="37" y={y(h) + 4} textAnchor="end" className="chart-label">{h.toFixed(2)}</text></g>)}
      {[0, 0.25, 0.5, 0.75, 1].map(f => <g key={f}><text x={x(duration * f)} y="193" textAnchor="middle" className="chart-label">{duration * f}</text></g>)}
      <text x="13" y="15" className="chart-label">h (m)</text><text x="758" y="193" className="chart-label">s</text>
      {[0, 1, 2].map(i => <polyline key={i} points={history.map(s => `${x(s.time)},${y(s.heights[i])}`).join(" ")} fill="none" stroke={TANK_COLORS[i]} strokeWidth="2.6" strokeDasharray={i === 1 ? "7 3" : i === 2 ? "2 3" : undefined} />)}
    </svg>
  </div>;
}
