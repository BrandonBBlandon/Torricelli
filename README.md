# Torricelli Challenge — El profesor contra la física

Videojuego en español para una exposición de matemáticas: regula tres tanques conectados por gravedad, observa sus niveles y descubre la ecuación detrás de cada movimiento. Implementado con Next.js App Router, TypeScript y Tailwind CSS. Motor, gráfica y registros funcionan en el navegador. No requiere cuentas, API, claves, bases de datos, fuentes remotas ni servicios externos.

## Ejecutar

Se probó con Node.js 22.14 y npm 10. Incluye `package-lock.json`.

```sh
npm ci
npm run dev
```

Abre `http://localhost:3000`. Para la exposición, utiliza la exportación de producción:

```sh
npm run build
npm run preview
```

Abre `http://127.0.0.1:4173`. `next.config.ts` configura `output: 'export'`; `build` genera **`out/`** y `preview` sirve exclusivamente esa carpeta con un servidor HTTP estático local. Se puede copiar `out/` a otro alojamiento estático en su raíz. No uses `next start` ni abras `index.html` con `file://`. Después de instalar y construir, no hace falta conexión a Internet para servir o jugar. Detén el servidor con Ctrl+C.

## Jugar

- Elige una misión, prepara las tres válvulas y pulsa **Iniciar simulación**. Todas las misiones están disponibles desde el principio.
- Ganas al completar el tiempo sin derrames ni mantener un tanque fuera de su franja durante **4 segundos consecutivos**. Volver al rango reinicia ese contador. Las alertas incluyen texto y tiempo restante de reacción.
- La puntuación es `redondear(1000 × tiempo con los tres tanques en rango / duración)`. Las mejores victorias por misión se guardan en `localStorage`, bajo `torricelli-records-v1`. Persiste la puntuación y el tiempo en rango; recargar inicia una partida nueva. Si el almacenamiento está bloqueado, se avisa y se permite jugar con marcas de sesión.
- **Pausar** detiene física, cronómetro y eventos. También puedes ajustar controles durante la pausa. Ocultar la pestaña pausa automáticamente: al volver, pulsa **Continuar**.
- **Ampliar tablero** muestra tanques, reloj y válvulas en una sola pantalla para el proyector. **Esc** o **Salir de exposición** vuelve a la vista normal con gráfica y matemática. Ensayado a 1366 × 768.
- Selecciona un tanque o su tarjeta y abre **Ver matemática**: muestra altura, caudales, sustitución, unidades y signo de la derivada. La gráfica registra alturas cada 0,25 s y añade el punto final. En resultados se muestra el motivo concreto y la gráfica de esa partida.
- Teclado, con el foco fuera de los controles: **1/2/3** seleccionan tanque, **↑/↓** cambian su apertura ±5 puntos y **Espacio/P** inicia o pausa. En un deslizador enfocado, las flechas cambian 1 punto; Inicio/Fin van al mínimo/máximo. Tab recorre los controles, incluidos los tanques del dibujo.
- En móvil, desliza horizontalmente el dibujo para recorrer la cascada. Los controles se apilan, con etiqueta de su tanque y caudal. La lista de misiones también se desliza.
- El **Laboratorio libre** permite variar la entrada entre 0 y 5 L/s, los diámetros entre 10 y 50 mm y las aperturas entre 0 y 100 %. No penaliza derrames ni salidas del rango. Cada experimento dura hasta 300 s; puedes reiniciarlo. Cierra la entrada para observar el vaciado del primer tanque aislado de la alimentación; los otros reciben su descarga.

## Secuencias ganadoras para ensayar

Usa **Reiniciar misión** antes de cada ensayo y conserva los diámetros indicados. Las aperturas se refieren a las válvulas **1, 2 y 3**, en ese orden. Puedes mover los deslizadores con el ratón y afinar con sus flechas del teclado.

| Misión | Duración / rango | Diámetros 1–3 | Secuencia de aperturas 1–3 |
| --- | --- | --- | --- |
| El primer equilibrio | 40 s / 0,50–1,10 m | 32 / 32 / 32 mm | Antes de iniciar: **84 / 84 / 84 %**. Mantener. |
| Efecto dominó | 50 s / 0,45–1,15 m | 36 / 36 / 36 mm | Antes de iniciar: **88 / 88 / 88 %**. Mantener. |
| Contra la corriente | 60 s / 0,55–1,10 m | 42 / 42 / 42 mm | Antes de iniciar: **48 / 48 / 48 %**. A los **18 s**: **100 / 100 / 100 %**. A los **38 s**: **33 / 33 / 33 %**. |

En la tercera misión el reloj restante marca aproximadamente **00:42** y **00:22** en los cambios. Para ajustar sin prisas, pausa al cambiar la entrada, regula las tres válvulas y continúa. Los eventos ocurren en el tiempo **transcurrido** de la simulación, no según el reloj del ordenador.

`REHEARSALS` en `src/lib/missions.ts` codifica exactamente estas acciones. Las pruebas usan `stepGame`, `copyControls` y los mismos porcentajes y diámetros que la interfaz: no hay controles privilegiados ni un modo de victoria artificial. También ensayan 1 s de reacción tras cada evento. Resultados medidos:

| Misión | Altura mínima–máxima, acción en el instante del evento | Con 1 s de reacción | Puntos |
| --- | --- | --- | --- |
| Equilibrio | 0,7966–0,8000 m | igual | 1000 |
| Dominó | 0,5500–0,9500 m | igual | 1000 |
| Corriente | 0,7959–0,8030 m | 0,7851–0,8225 m | 1000 |

## Demo de dos minutos para clase

1. **0:00–0:20.** Presenta la misión 1: “¿Cómo mantenemos constante la altura si entra y sale agua?”. Señala la franja segura y conecta visualmente cada salida con el tanque siguiente.
2. **0:20–1:00.** Ajusta las tres válvulas a 84 % e inicia los 40 s. Usa Ampliar tablero si necesitas más espacio. Explica que el nivel deja de cambiar cuando entrada y salida se igualan. Al terminar, muestra los 1000 puntos y las líneas casi horizontales del resultado.
3. **1:00–1:25.** Entra al laboratorio, abre Ver matemática y selecciona el tanque 1. Pon diámetro 20 mm y observa Q; cámbialo a 40 mm mientras el tiempo está detenido. La altura y apertura son idénticas: el caudal se multiplica por cuatro, porque el área depende de d².
4. **1:25–1:45.** Cierra la entrada y abre la válvula 1 al 100 %. Inicia: dh/dt es negativa y el caudal disminuye al bajar h. Pausa para leer la sustitución y la gráfica.
5. **1:45–2:00.** Cierra la válvula 1: Q de salida es cero. Con entrada también cerrada, pregunta al público qué signo tendrá dh/dt antes de mostrar el resultado. Invita a intentar la misión del pulso.

## Modelo físico y reloj

Las unidades internas son **m, s y m³**; la interfaz convierte caudales y volúmenes a L/s y L. Diámetros de los controles en mm.

```text
a = π (d/1000)² / 4
u = apertura / 100
Qsal = Cd · a · u · √(2 g h)
dh/dt = (Qent − Qsal) / A                    (sin derrame)
Vnuevo = V + (Qent − Qsal) Δt, limitado a [0, A Hmáx]
Vinicial + Ventrada = ΣVtanques + Vdesagüe + Vderrame
```

Cada tanque tiene sección constante `A = 0,09 m²`, altura máxima `1,4 m`, y `Cd = 0,62`; `g = 9,81 m/s²`. El agua es incompresible, ambos extremos están a presión atmosférica y el orificio está en el fondo. El coeficiente de descarga es constante y la apertura escala linealmente el área efectiva. Las tuberías tienen volumen y tiempo de tránsito despreciables; se omiten pérdidas adicionales, oleaje, viscosidad variable y contrapresión. El dibujo es un esquema, no una representación geométrica a escala: cada salida descarga libremente al siguiente tanque a menor elevación. Los derrames salen del sistema; no alimentan al tanque siguiente.

El integrador explícito usa **Δt = 1/120 s**. Calcula todas las salidas desde el estado anterior, limita cada transferencia al volumen disponible, propaga la descarga al siguiente tanque y contabiliza el excedente como derrame. Así no crea agua ni permite que un volumen nuevo atraviese dos tanques en el mismo paso. El último orificio alimenta el desagüe.

`SimulationClock` acumula tiempo de `performance.now` entregado por requestAnimationFrame; llama al integrador con pasos fijos independientemente del refresco de React (como máximo ~16 Hz). Física, eventos, cronómetro y condiciones de victoria avanzan con ese único tiempo simulado. Pausas y cambios de visibilidad limpian el acumulador. Bloqueos de más de 250 ms se descartan en lugar de recuperarse de golpe: en un dispositivo saturado el experimento puede tardar más tiempo real.

En el tanque lleno, el panel resta también Qderrame del balance y muestra dh/dt = 0: el excedente sale del sistema y la altura se mantiene limitada. Cerca del equilibrio significa `|dh/dt| < 0,0005 m/s`, y es distinto del criterio de puntuación, que exige estar dentro del rango seguro.

## Editar el juego

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/missions.ts` | Misiones, alturas iniciales, duración, franjas seguras, diámetros, válvulas, eventos de entrada y secuencias de ensayo. |
| `src/lib/physics.ts` | Torricelli, caudales, integración y contabilidad de volumen. |
| `src/lib/game.ts` | Cronómetro simulado, muestreo de gráfica, condiciones de fin, puntuación y validación de marcas guardadas. |
| `src/lib/clock.ts` | Acumulador de pasos fijos y descarte de pausas/bloqueos. |
| `src/components/control-room.tsx` | Controles, teclado, almacenamiento local, resultados y sustitución matemática. |
| `src/components/hydraulic-board.tsx` | Esquema SVG interactivo, niveles y flujos. |
| `src/components/history-chart.tsx` | Gráfica SVG con tres estilos de línea y banda segura. |
| `src/app/globals.css` | Tailwind y apariencia industrial, móvil y modo de exposición. |

Después de modificar parámetros, actualiza las secuencias y vuelve a ejecutar sus pruebas. El tablero está diseñado para tres tanques de hasta 1,4 m; si cambias esa escala, adapta también los ejes del dibujo y de la gráfica.

## Verificación

Verificación realizada: lint y tipos sin errores, **13 pruebas de física/reglas aprobadas**, build estático correcto y **11 recorridos de navegador aprobados** sobre `out/` con Chrome. La prueba del modo proyector se ejecuta en escritorio y se omite intencionalmente en el proyecto móvil, donde ese botón está oculto. Se revisaron capturas del tablero, victoria, laboratorio y vista ampliada.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Si ya tienes Chrome instalado, puedes utilizarlo sin descargar Chromium. En PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run test:e2e
```

Playwright inicia `npm run preview` y prueba **la exportación `out/`**, no el servidor de desarrollo. Usa escritorio a 1440 × 1100 y emulación móvil Pixel 7. Los ensayos aceleran el reloj del navegador conservando todos los pasos de la simulación; las acciones entran por los controles DOM y el teclado, nunca modifican el estado del motor. Las capturas y trazas de fallos se escriben en `test-results/` (ignorado por Git).

Pruebas físicas y de reglas: válvula cerrada, proporción d², conservación incluyendo derrames y desagüe (error absoluto < **10⁻¹⁰ m³**), volúmenes no negativos, orden de transferencias, las tres victorias, derrotas, eventos, pausa, descarte de saltos y registros corruptos.

Para un tanque aislado con entrada cero, se contrasta todo el vaciado hasta después de quedar seco con:

```text
k = Cd · a · u · √(2g) / A
h(t) = max(0, √h0 − k t/2)²
```

Caso: `h0 = 1 m`, `A = 0,09 m²`, diámetro `20 mm`, apertura `100 %`, `Cd = 0,62`, 250 s a 120 pasos/s. Tolerancia explícita **0,0002 m = 0,2 mm**. Error máximo medido **0,000014694 m ≈ 0,015 mm**.

Los flujos de navegador cubren victoria, derrota con motivo, gráfica final, pausa, sustitución matemática, récord tras recargar, siguiente misión, eventos a 18/38 s, laboratorio, teclado, entrada cerrada, edición de diámetro, pestaña oculta, almacenamiento bloqueado y ausencia de desbordamiento horizontal de la página. El móvil usa emulación; no se ensayó en un teléfono físico ni con un proyector real.
