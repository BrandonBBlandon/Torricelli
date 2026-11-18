"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SimulationClock } from "@/lib/clock";
import { createGame, readRecords, RECORD_KEY, scoreOf, stepGame, type GameState, type Records } from "@/lib/game";
import { copyControls, feedAt, LAB, MISSIONS, type Mission } from "@/lib/missions";
import { flows, G } from "@/lib/physics";
import HistoryChart, { TANK_COLORS } from "./history-chart";
import HydraulicBoard from "./hydraulic-board";

const number = (n: number, digits = 2) => n.toLocaleString("es-CO", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const timeLabel = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const terminal = (game: GameState) => ["won", "lost", "finished"].includes(game.phase);

function Icon({ name, size = 20 }: { name: "drop" | "play" | "pause" | "reset" | "flask" | "arrow" | "chart" | "check"; size?: number }) {
  const paths = {
    drop: "M12 3C9 7 5 11 5 15a7 7 0 0014 0c0-4-4-8-7-12z M8 15a4 4 0 004 4",
    play: "M8 4l12 8-12 8z", pause: "M8 5v14M16 5v14", reset: "M3 10a9 9 0 111 8M3 4v6h6",
    flask: "M9 3h6M10 3v7L4 20h16l-6-10V3M7 15h10", arrow: "M4 12h16M14 6l6 6-6 6",
    chart: "M4 3v17h17M7 15l4-5 4 3 6-8", check: "M5 12l4 4L20 5",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function ControlRoom() {
  const [mission, setMission] = useState(MISSIONS[0]);
  const [game, setGame] = useState(() => createGame(MISSIONS[0]));
  const [controls, setControls] = useState(() => copyControls(MISSIONS[0]));
  const [diameterDrafts, setDiameterDrafts] = useState(() => MISSIONS[0].controls.diameters.map(String));
  const [selected, setSelected] = useState(0);
  const [records, setRecords] = useState<Records>({});
  const [storageMessage, setStorageMessage] = useState("");
  const [mathOpen, setMathOpen] = useState(false);
  const [exhibition, setExhibition] = useState(false);
  const missionRef = useRef(mission);
  const gameRef = useRef(game);
  const controlsRef = useRef(controls);
  const selectedRef = useRef(0);
  const recordsRef = useRef<Records>({});
  const clock = useRef(new SimulationClock());
  const resultRef = useRef<HTMLElement>(null);

  const selectTank = useCallback((index: number) => { selectedRef.current = index; setSelected(index); }, []);
  const updateControl = useCallback((field: "openings" | "diameters" | "feed", value: number, tank = selectedRef.current) => {
    if (terminal(gameRef.current)) return;
    const next = { ...controlsRef.current };
    if (field === "feed") next.feed = Math.min(5, Math.max(0, value));
    else {
      next[field] = [...next[field]];
      next[field][tank] = Math.min(field === "openings" ? 100 : 50, Math.max(field === "openings" ? 0 : 10, Math.round(value)));
    }
    controlsRef.current = next;
    setControls(next);
  }, []);

  const loadMission = useCallback((next: Mission) => {
    missionRef.current = next;
    const initial = createGame(next);
    const initialControls = copyControls(next);
    gameRef.current = initial;
    controlsRef.current = initialControls;
    clock.current.reset();
    setMission(next); setGame(initial); setControls(initialControls); selectTank(0);
    setDiameterDrafts(initialControls.diameters.map(String));
  }, [selectTank]);

  const toggleRun = useCallback(() => {
    const previous = gameRef.current;
    if (terminal(previous)) return;
    const next: GameState = { ...previous, phase: previous.phase === "running" ? "paused" : "running" };
    gameRef.current = next;
    clock.current.reset();
    setGame(next);
  }, []);

  useEffect(() => {
    let frame = 0;
    let lastPaint = 0;
    let lastPhase = gameRef.current.phase;
    const readSaved = () => {
      try { recordsRef.current = readRecords(localStorage.getItem(RECORD_KEY)); setRecords(recordsRef.current); }
      catch { setStorageMessage("El navegador bloqueó el guardado. Puedes seguir jugando; tus marcas durarán esta sesión."); }
    };
    readSaved();
    const animate = (now: number) => {
      clock.current.tick(now, gameRef.current.phase === "running" && !document.hidden, () => {
        gameRef.current = stepGame(missionRef.current, gameRef.current, controlsRef.current);
      });
      const current = gameRef.current;
      if (terminal(current) && lastPhase === "running" && current.phase === "won") {
        const currentMission = missionRef.current;
        const score = scoreOf(current, currentMission);
        let saved = recordsRef.current;
        try { saved = { ...saved, ...readRecords(localStorage.getItem(RECORD_KEY)) }; } catch { /* Session records still work. */ }
        if (!(saved[currentMission.id]?.score >= score)) {
          const next = { ...saved, [currentMission.id]: { score, safeTime: current.safeTime } };
          try { localStorage.setItem(RECORD_KEY, JSON.stringify(next)); }
          catch { setStorageMessage("No se pudo guardar en este navegador. La marca permanece durante esta sesión."); }
          recordsRef.current = next;
          setRecords(next);
        }
      }
      if (now - lastPaint > 60 || current.phase !== lastPhase) { setGame(current); lastPaint = now; }
      lastPhase = current.phase;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const visibility = () => {
      clock.current.reset();
      if (document.hidden && gameRef.current.phase === "running") {
        gameRef.current = { ...gameRef.current, phase: "paused" };
        setGame(gameRef.current);
      }
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExhibition(false);
      if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLElement && event.target.closest("input, select, textarea, button, summary, [role=button]")) return;
      if (["1", "2", "3"].includes(event.key)) selectTank(Number(event.key) - 1);
      else if (event.code === "Space" || event.key.toLowerCase() === "p") { event.preventDefault(); toggleRun(); }
      else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        updateControl("openings", controlsRef.current.openings[selectedRef.current] + (event.key === "ArrowUp" ? 5 : -5));
      }
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", keyboard);
    window.addEventListener("storage", readSaved);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("keydown", keyboard); window.removeEventListener("storage", readSaved); };
  }, [selectTank, toggleRun, updateControl]);

  useEffect(() => { if (["won", "lost", "finished"].includes(game.phase)) resultRef.current?.focus(); }, [game.phase]);

  const ended = terminal(game);
  const feed = feedAt(mission, game.time, controls);
  const { incoming, outgoing } = flows(mission.tanks, game.hydraulics, controls, feed);
  const heights = game.hydraulics.volumes.map((v, i) => v / mission.tanks[i].area);
  const tank = mission.tanks[selected];
  const h = heights[selected];
  const spillRate = h >= tank.maxHeight - 1e-9 ? Math.max(0, incoming[selected] - outgoing[selected]) : 0;
  const derivative = (incoming[selected] - outgoing[selected] - spillRate) / tank.area;
  const change = spillRate > 0 ? "Nivel máximo: el excedente se derrama" : Math.abs(derivative) < 0.0005 ? "Cerca del equilibrio" : derivative > 0 ? "El nivel está subiendo" : "El nivel está bajando";
  const warningTank = heights.findIndex(level => level < mission.safe[0] || level > mission.safe[1]);
  const event = [...mission.events].reverse().find(e => e.at <= game.time + 1e-8);
  const nextEvent = mission.events.find(e => e.at > game.time + 1e-8);
  const nextMission = MISSIONS[MISSIONS.findIndex(m => m.id === mission.id) + 1];
  const activePhaseLabel = { ready: "LISTO PARA COMENZAR", running: "SIMULACIÓN EN VIVO", paused: "SIMULACIÓN EN PAUSA", won: "MISIÓN SUPERADA", lost: "MISIÓN TERMINADA", finished: "EXPERIMENTO COMPLETADO" }[game.phase];

  return <div className={`app-shell ${exhibition ? "exhibition" : ""}`}>
    <a className="skip-link" href="#main">Ir al tablero</a>
    <header className="topbar">
      <a href="./" className="brand" aria-label="Torricelli Challenge, inicio"><span className="brand-symbol"><Icon name="drop" size={25} /></span><span>TORRICELLI<span className="brand-light"> / CHALLENGE</span></span></a>
      <nav aria-label="Modo de juego" className="mode-nav"><button className={!mission.laboratory ? "active" : ""} onClick={() => mission.laboratory && loadMission(MISSIONS[0])}>Misiones</button><button className={mission.laboratory ? "active" : ""} onClick={() => !mission.laboratory && loadMission(LAB)}><Icon name="flask" size={16} /> Laboratorio</button></nav>
      <span className="local-badge"><i /> Todo ocurre en tu navegador</span>
    </header>

    <div className="workspace">
      <aside className="sidebar" aria-label="Selección de misiones e instrucciones">
        <div className="sidebar-heading"><span className="eyebrow">BITÁCORA DE CAMPO</span><span className="small-code">VOL. 01</span></div>
        <h2>El reto del profesor<span>.</span></h2>
        <p className="sidebar-intro">La gravedad pone las reglas.<br />Tú encuentras el equilibrio.</p>
        <div className="mission-list">
          {MISSIONS.map((m, i) => <button key={m.id} className={`mission-card ${mission.id === m.id ? "selected" : ""}`} onClick={() => loadMission(m)} aria-pressed={mission.id === m.id}>
            <span className="mission-number">0{i + 1}</span><span className="mission-info"><strong>{m.name}</strong><span>{m.duration} s <b>·</b> {i === 0 ? "Iniciación" : i === 1 ? "Intermedio" : "Desafío"}</span><span className="record">{records[m.id] ? `✓ Mejor marca: ${records[m.id].score} / 1000` : "Sin marca todavía"}</span></span><span className="mission-chevron">↗</span>
          </button>)}
          <button className={`lab-card ${mission.laboratory ? "selected" : ""}`} onClick={() => loadMission(LAB)} aria-pressed={!!mission.laboratory}><Icon name="flask" /><span><strong>Laboratorio libre</strong><span>Pregunta, prueba, descubre.</span></span><span>↗</span></button>
        </div>
        <div className="how-to"><span className="eyebrow">TU OBJETIVO</span><p>Mantén el agua en la franja segura de los tres tanques.</p><ol><li><span>01</span>Ajusta la apertura de cada válvula.</li><li><span>02</span>Observa cómo fluye la cascada.</li><li><span>03</span>Sobrevive hasta que termine el reloj.</li></ol><div className="rule-note">⚠ Pierdes si hay derrame o un tanque pasa 4 s seguidos fuera del rango.</div></div>
        <details className="keyboard-help"><summary>⌨ Controles de teclado</summary><p><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> Seleccionar tanque<br /><kbd>↑</kbd> <kbd>↓</kbd> Válvula ±5%<br /><kbd>Espacio</kbd> Iniciar / pausar</p><p>En un deslizador enfocado, usa las flechas para ajustar su valor; Inicio y Fin van a los extremos.</p></details>
        <div className="sidebar-bottom"><span className="mini-drop">◈</span><span>FÍSICA REAL. CURIOSIDAD INFINITA.<br /><small>Diseñado para aprender experimentando.</small></span></div>
      </aside>

      <main id="main" className="main-content">
        <div className="page-heading"><div><p className="eyebrow"><span className="mint-dot" /> LABORATORIO DE HIDRODINÁMICA</p><h1>El profesor contra la física<span>.</span></h1><p>Tres tanques. Una ley. El equilibrio está en tus manos.</p></div><div className="physics-stamp"><span>LEY DE TORRICELLI</span><strong>v = √(2gh)</strong><small>Desde 1643, sin excepciones.</small></div></div>

        <section className="briefing" aria-label="Misión actual"><div className="briefing-icon"><Icon name={mission.laboratory ? "flask" : "arrow"} /></div><div><span className="eyebrow">{mission.subtitle}</span><h2>{mission.name}</h2><p>{mission.briefing}</p></div><div className="target-range"><span>RANGO SEGURO</span><strong>{number(mission.safe[0])}–{number(mission.safe[1])}<small> m</small></strong></div></section>

        <section className="control-panel" aria-label="Sala de control">
          <div className="panel-toolbar"><div className="live-status"><span className={game.phase === "running" ? "live-dot" : "status-dot"} /><span aria-live="polite">{activePhaseLabel}</span></div><div className="simulation-actions"><button className="expand-button secondary-button" aria-pressed={exhibition} onClick={() => setExhibition(v => !v)}>{exhibition ? "↙ Salir de exposición" : "↗ Ampliar tablero"}</button><button className="icon-button" onClick={() => loadMission(mission)} title="Reiniciar misión" aria-label="Reiniciar misión"><Icon name="reset" size={17} /></button><button className="run-button" onClick={toggleRun} disabled={ended}><Icon name={game.phase === "running" ? "pause" : "play"} size={16} />{game.phase === "running" ? "Pausar" : game.phase === "paused" ? "Continuar" : "Iniciar simulación"}</button></div></div>
          <div className="telemetry"><div><span>TIEMPO {mission.laboratory ? "DE EXPERIMENTO" : "RESTANTE"}</span><strong data-testid="timer">{timeLabel(mission.laboratory ? game.time : Math.max(0, Math.ceil(mission.duration - game.time - 1e-8)))}</strong><small>{number(game.time, 1)} / {mission.duration} s</small></div><div><span>ENTRADA AL SISTEMA</span><strong>{number(feed * 1000)}<small> L/s</small></strong><small>Q de alimentación</small></div><div><span>TIEMPO EN EQUILIBRIO</span><strong>{number(game.safeTime, 1)}<small> s</small></strong><small>Los tres tanques en rango</small></div><div className={game.hydraulics.spilled > 0 ? "danger-text" : ""}><span>AGUA DERRAMADA</span><strong>{number(game.hydraulics.spilled * 1000)}<small> L</small></strong><small>{game.hydraulics.spilled > 0 ? "Se superó la capacidad" : "Cada gota cuenta"}</small></div></div>

          {ended ? <section className={`result-panel ${game.phase === "lost" ? "failure" : "success"}`} tabIndex={-1} ref={resultRef} aria-label="Resultado de la misión" data-testid="result">
            <span className="result-symbol">{game.phase === "won" ? "✓" : game.phase === "lost" ? "!" : "◈"}</span><p className="eyebrow">{game.phase === "won" ? "EL PROFESOR 1 — CAOS 0" : game.phase === "lost" ? "LA FÍSICA TIENE LA ÚLTIMA PALABRA" : "UNA PREGUNTA LLEVA A OTRA"}</p><h2>{game.phase === "won" ? "Equilibrio conseguido." : game.phase === "lost" ? "Vuelve a intentarlo." : "Experimento completado."}</h2><p className="result-reason">{game.reason}</p>{game.phase === "won" && <p className="result-score">{scoreOf(game, mission)} <span>/ 1000 puntos · mejor marca {records[mission.id]?.score ?? scoreOf(game, mission)}</span></p>}<HistoryChart history={game.history} duration={mission.duration} safe={mission.safe} id="result-chart" /><div className="chart-legend">{TANK_COLORS.map((c, i) => <span key={c}><i style={{ background: c }} />Tanque {i + 1}</span>)}</div><div className="result-actions"><button className="run-button" onClick={() => loadMission(mission)}><Icon name="reset" size={16} /> Intentar de nuevo</button>{game.phase === "won" && nextMission && <button className="secondary-button" onClick={() => loadMission(nextMission)}>Siguiente misión <Icon name="arrow" size={16} /></button>}<button className="text-button" onClick={() => loadMission(LAB)}>Ir al laboratorio →</button></div></section> : <HydraulicBoard mission={mission} game={game} controls={controls} selected={selected} onSelect={selectTank} />}

          <div className={`system-message ${warningTank >= 0 ? "warning" : ""}`} role="status"><span>{warningTank >= 0 ? "⚠" : "↳"}</span><p>{warningTank >= 0 ? `Tanque ${warningTank + 1} fuera del rango · ${number(game.outside[warningTank], 1)} de 4 s${mission.laboratory ? " (en laboratorio no pierdes)" : " · ¡ajusta su válvula!"}` : game.phase === "ready" ? "Prepara las válvulas y pulsa Iniciar simulación. Puedes ajustar antes de empezar." : game.phase === "paused" ? "Tiempo detenido. Puedes ajustar las válvulas antes de continuar." : event?.label ?? "Experimenta: cambia una variable y observa qué pasa."}</p>{nextEvent && <span className="next-event">Próximo cambio: {nextEvent.at} s</span>}</div>
          <div className="valve-controls">{[0, 1, 2].map(i => <section key={i} className={`valve-card ${selected === i ? "selected" : ""}`} aria-label={`Controles del tanque ${i + 1}`}><button className="valve-heading" aria-pressed={selected === i} onClick={() => selectTank(i)}><span><i style={{ background: TANK_COLORS[i] }} /> VÁLVULA 0{i + 1}</span><span>{i < 2 ? `→ Tanque ${i + 2}` : "→ Desagüe"}</span></button><div className="valve-value"><label htmlFor={`valve-${i}`}>Apertura</label><strong>{controls.openings[i]}<small>%</small></strong></div><input id={`valve-${i}`} aria-label={`Apertura válvula ${i + 1}`} type="range" min="0" max="100" step="1" value={controls.openings[i]} onFocus={() => selectTank(i)} onChange={e => updateControl("openings", Number(e.target.value), i)} disabled={ended} /><div className="range-ends"><span>Cerrada</span><span>Abierta</span></div><div className="diameter-control"><label htmlFor={`diameter-${i}`}>Diámetro del orificio</label><div><input id={`diameter-${i}`} aria-label={`Diámetro tanque ${i + 1}`} type="number" inputMode="numeric" min="10" max="50" step="1" value={diameterDrafts[i]} onChange={e => { const text = e.target.value; setDiameterDrafts(previous => previous.map((v, index) => index === i ? text : v)); const value = Number(text); if (text !== "" && Number.isInteger(value) && value >= 10 && value <= 50) updateControl("diameters", value, i); }} onBlur={() => setDiameterDrafts(previous => previous.map((v, index) => index === i ? String(controlsRef.current.diameters[i]) : v))} disabled={ended} /><span>mm</span></div></div><div className="tank-readout"><span>h = {number(heights[i], 3)} m</span><span>Q = {number(outgoing[i] * 1000)} L/s</span></div></section>)}</div>
          {mission.laboratory && <div className="feed-control"><Icon name="drop" /><label htmlFor="feed">Entrada externa <strong>{number(controls.feed)} L/s</strong></label><input id="feed" aria-label="Entrada externa" type="range" min="0" max="5" step="0.05" value={controls.feed} onChange={e => updateControl("feed", Number(e.target.value))} disabled={ended} /><button className="secondary-button" onClick={() => updateControl("feed", 0)} disabled={ended}>Cerrar entrada</button></div>}
        </section>

        <details className="math-panel" open={mathOpen} onToggle={e => setMathOpen(e.currentTarget.open)}><summary><span className="math-glyph">ƒ</span><span>Ver matemática <small>Lo que el agua te está diciendo</small></span><span className="summary-plus">{mathOpen ? "−" : "+"}</span></summary><div className="math-body"><div className="math-tank-selector" role="group" aria-label="Tanque para analizar">{[0, 1, 2].map(i => <button className={selected === i ? "active" : ""} key={i} onClick={() => selectTank(i)}>Tanque {i + 1}</button>)}</div><div className="math-columns"><div><span className="eyebrow">01 / LEY DE TORRICELLI</span><p className="equation">Q<sub>sal</sub> = C<sub>d</sub> · a · u · √(2gh)</p><p className="substitution">a = π · ({number(controls.diameters[selected] / 1000, 3)})² / 4 = {number(Math.PI * (controls.diameters[selected] / 1000) ** 2 / 4, 6)} m²</p><p className="substitution">Q<sub>sal</sub> = {number(tank.cd)} × {number(Math.PI * (controls.diameters[selected] / 1000) ** 2 / 4, 6)} × {number(controls.openings[selected] / 100)} × √(2 × {number(G)} × {number(h, 3)})</p><strong className="math-answer">= {number(outgoing[selected], 6)} m³/s <span>({number(outgoing[selected] * 1000, 3)} L/s)</span></strong></div><div><span className="eyebrow">02 / BALANCE DE VOLUMEN</span><p className="equation">dh/dt = (Q<sub>ent</sub> − Q<sub>sal</sub>{spillRate > 0 && <> − Q<sub>der</sub></>}) / A</p><p className="substitution">h = {number(h, 3)} m · A = {number(tank.area)} m²</p><p className="substitution">dh/dt = ({number(incoming[selected], 6)} − {number(outgoing[selected], 6)}{spillRate > 0 && <> − {number(spillRate, 6)}</>}) / {number(tank.area)}</p><strong className="math-answer">= {derivative > 0 ? "+" : ""}{number(derivative, 5)} m/s</strong><p className="derivative-status">{derivative > 0.0005 ? "↗" : derivative < -0.0005 ? "↘" : "≈"} {change}</p><p className="math-note">Entrada: {number(incoming[selected] * 1000, 3)} L/s · Salida: {number(outgoing[selected] * 1000, 3)} L/s. {spillRate > 0 ? `Derrame: ${number(spillRate * 1000, 3)} L/s. El excedente sale del sistema; dh/dt = 0 en el nivel máximo.` : Math.abs(derivative) < 0.0005 ? "Los caudales son casi iguales: |dh/dt| < 0,0005 m/s." : derivative > 0 ? "Entra más agua de la que sale." : "Sale más agua de la que entra."}</p></div></div><p className="math-footnote">C<sub>d</sub> = 0,62 · g = 9,81 m/s² · u = apertura / 100 · h se mide desde el orificio. El modelo supone agua incompresible y descarga libre por gravedad.</p></div></details>

        {!ended && <section className="chart-panel" aria-label="Gráfica de alturas"><div className="section-heading"><h2><Icon name="chart" size={18} /> El pulso del sistema</h2><span>ALTURA / TIEMPO</span></div><div className="chart-legend">{TANK_COLORS.map((c, i) => <span key={c}><i style={{ background: c }} />Tanque {i + 1}</span>)}<span className="safe-legend">┄ Rango seguro</span></div><HistoryChart history={game.history} duration={mission.duration} safe={mission.safe} /><p className="chart-caption">Una línea horizontal significa que la altura permanece constante. ¿Puedes conseguir tres?</p></section>}
        {storageMessage && <p className="storage-notice" role="status">{storageMessage}</p>}
        <footer className="page-footer"><span>TORRICELLI CHALLENGE <b>—</b> Matemáticas que se pueden tocar.</span><span>Simulación local · Mejores marcas en este navegador</span></footer>
      </main>
    </div>
  </div>;
}
