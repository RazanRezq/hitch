'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AURORA_VERT,
  AURORA_FRAG,
  STAR_VERT,
  STAR_FRAG,
  createStarData,
  compileProgram,
} from './aurora-sky.glsl';

/**
 * Hero night sky: hand-written WebGL — an fbm aurora curtain over the
 * Iceland-night gradient, plus a GPU point starfield with per-star twinkle
 * and pointer/scroll parallax. Zero dependencies on purpose.
 *
 * Degrades to the static `.ed-aurora-fallback` layer (always in the DOM,
 * painted behind the canvas) whenever WebGL is unavailable, the GL context
 * is lost, or the user prefers reduced motion. Pauses off-screen and when
 * the tab is hidden. Fully torn down on unmount.
 */
export function AuroraSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mql.matches);
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (reduced) return; // static fallback only
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl || gl.isContextLost()) return; // keep the CSS fallback visible

    const aRes = compileProgram(gl, 'aurora', AURORA_VERT, AURORA_FRAG);
    const sRes = compileProgram(gl, 'stars', STAR_VERT, STAR_FRAG);
    const auroraProg = aRes.program;
    const starProg = sRes.program;
    if (!auroraProg || !starProg) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[AuroraSky]', aRes.error ?? sRes.error);
      }
      return; // keep the CSS fallback visible
    }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const area = window.innerWidth * window.innerHeight;
    const star = createStarData(Math.max(350, Math.min(900, Math.round(area / 2200))));
    const starVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starVbo);
    gl.bufferData(gl.ARRAY_BUFFER, star.data, gl.STATIC_DRAW);

    const aQuad = gl.getAttribLocation(auroraProg, 'aPos');
    const uTimeA = gl.getUniformLocation(auroraProg, 'uTime');
    const uResA = gl.getUniformLocation(auroraProg, 'uResolution');
    const uRevA = gl.getUniformLocation(auroraProg, 'uReveal');

    const sLoc = (n: string) => gl.getAttribLocation(starProg, n);
    const aPos = sLoc('aPos');
    const aSize = sLoc('aSize');
    const aDepth = sLoc('aDepth');
    const aPhase = sLoc('aPhase');
    const aSpeed = sLoc('aSpeed');
    const aBright = sLoc('aBright');
    const uTimeS = gl.getUniformLocation(starProg, 'uTime');
    const uPtr = gl.getUniformLocation(starProg, 'uPointer');
    const uScr = gl.getUniformLocation(starProg, 'uScroll');
    const uDpr = gl.getUniformLocation(starProg, 'uDpr');
    const uRevS = gl.getUniformLocation(starProg, 'uReveal');

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);

    const resize = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const ptr = { x: 0, y: 0 };
    const ptrTarget = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      ptrTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
      ptrTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    if (!coarse) window.addEventListener('pointermove', onMove, { passive: true });

    let scrollTarget = 0;
    let scrollVal = 0;
    const onScroll = () => {
      const rect = canvas.getBoundingClientRect();
      scrollTarget = Math.max(0, Math.min(1, -rect.top / Math.max(rect.height, 1)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    let inView = true;
    let docVisible = !document.hidden;
    let running = false;
    let rafId = 0;
    const start = performance.now();

    const draw = (now: number) => {
      if (!running) return;
      rafId = requestAnimationFrame(draw);
      const elapsed = (now - start) / 1000;
      const rt = Math.max(0, Math.min(1, (elapsed - 0.25) / 1.6));
      const reveal = 1 - Math.pow(1 - rt, 3); // easeOutCubic, follows the text rise

      if (coarse) {
        ptr.x = Math.sin(elapsed * 0.15) * 0.4;
        ptr.y = Math.cos(elapsed * 0.11) * 0.25;
      } else {
        ptr.x += (ptrTarget.x - ptr.x) * 0.05;
        ptr.y += (ptrTarget.y - ptr.y) * 0.05;
      }
      scrollVal += (scrollTarget - scrollVal) * 0.08;

      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.disable(gl.BLEND);
      gl.useProgram(auroraProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(aQuad);
      gl.vertexAttribPointer(aQuad, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(uTimeA, elapsed);
      gl.uniform2f(uResA, canvas.width, canvas.height);
      gl.uniform1f(uRevA, reveal);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive starfield
      gl.useProgram(starProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, starVbo);
      const st = star.stride;
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, st, 0);
      gl.enableVertexAttribArray(aSize);
      gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, st, 8);
      gl.enableVertexAttribArray(aDepth);
      gl.vertexAttribPointer(aDepth, 1, gl.FLOAT, false, st, 12);
      gl.enableVertexAttribArray(aPhase);
      gl.vertexAttribPointer(aPhase, 1, gl.FLOAT, false, st, 16);
      gl.enableVertexAttribArray(aSpeed);
      gl.vertexAttribPointer(aSpeed, 1, gl.FLOAT, false, st, 20);
      gl.enableVertexAttribArray(aBright);
      gl.vertexAttribPointer(aBright, 1, gl.FLOAT, false, st, 24);
      gl.uniform1f(uTimeS, elapsed);
      gl.uniform2f(uPtr, ptr.x, ptr.y);
      gl.uniform1f(uScr, scrollVal);
      gl.uniform1f(uDpr, dpr);
      gl.uniform1f(uRevS, reveal);
      gl.drawArrays(gl.POINTS, 0, star.count);
    };

    const sync = () => {
      const shouldRun = inView && docVisible;
      if (shouldRun && !running) {
        running = true;
        rafId = requestAnimationFrame(draw);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(rafId);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e) inView = e.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVis = () => {
      docVisible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVis);

    const onLost = (e: Event) => {
      e.preventDefault();
      running = false;
      cancelAnimationFrame(rafId);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    gl.clearColor(0, 0, 0, 1);
    gl.disable(gl.DEPTH_TEST);
    sync();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('scroll', onScroll);
      if (!coarse) window.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteProgram(auroraProg);
      gl.deleteProgram(starProg);
      gl.deleteBuffer(quad);
      gl.deleteBuffer(starVbo);
      // NOTE: deliberately NOT calling WEBGL_lose_context.loseContext().
      // getContext() returns the canvas's existing context, so losing it
      // here would permanently break the next mount (React Strict Mode
      // double-invokes effects in dev). The GPU context is reclaimed when
      // the canvas element is garbage-collected.
    };
  }, [reduced]);

  return (
    <>
      <div className="ed-aurora-fallback" aria-hidden="true" />
      {!reduced && (
        <canvas ref={canvasRef} className="ed-aurora-canvas" aria-hidden="true" tabIndex={-1} />
      )}
    </>
  );
}
