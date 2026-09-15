"use client";

import { useEffect, useId, useRef, useState } from "react";
import { makeBlock, type Block } from "@/lib/bloub/cycles";
import { NOTIF_BLUE } from "@/lib/bloub/decor";
import { BotEngine, type BotFrame, type Look } from "@/lib/bloub/engine";
import { lookTarget, PITCH, PITCH_MAX, TURN_TIME, YAW_MAX } from "@/lib/bloub/gaze";
import { clamp, easings } from "@/lib/bloub/math";
import { DEMI_VIEWBOX, RAYON } from "@/lib/bloub/repere";
import { mixHex } from "@/lib/bloub/skins";
import { STATE_BY_ID } from "@/lib/bloub/states";

const VB = DEMI_VIEWBOX;
const VIEW = `${-VB} ${-VB} ${VB * 2} ${VB * 2}`;

const LANDING_CYCLE: Block[] = (["idle", "wink", "orbit"] as const).map(makeBlock);

const HERO_INK = "#dfff00";
const HERO_PAPER = "#08090a";

export interface BloubMascotProps {
  size?: number;
  color?: string;
  paper?: string;
  follow?: boolean;
  playing?: boolean;
  className?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function heroLook(nx: number, ny: number, tour: number, pointer: boolean): Look {
  const aimed = lookTarget({ nx, ny, tour, pointer });
  return {
    ...aimed,
    yaw: nx * YAW_MAX,
    pitch: PITCH - ny * PITCH_MAX,
    spin: 0,
  };
}

function sampleIdle(): BotFrame {
  return new BotEngine(RAYON, "idle").sample(0);
}

export default function BloubMascot({
  size = 200,
  color = HERO_INK,
  paper = HERO_PAPER,
  follow = true,
  playing = true,
  className,
}: BloubMascotProps) {
  const uid = useId().replace(/:/g, "");
  const maskId = `bloub-mask-${uid}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [engine] = useState(() => new BotEngine(RAYON, "idle"));
  const [frame, setFrame] = useState<BotFrame>(sampleIdle);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    if (reduced) {
      engine.reset("idle", 0);
      return;
    }

    const cycle = LANDING_CYCLE;
    let raf = 0;
    let clock = 0;
    let last = 0;
    let blockIndex = 0;
    let blockStart = 0;
    let nextAt = playing && cycle[0] ? cycle[0].duration : Infinity;
    let pointer: { x: number; y: number } | null = null;
    let aiming = false;
    let turnSince = 0;

    engine.reset(cycle[0]?.state ?? "idle", 0);

    const release = () => {
      if (!aiming) return;
      engine.setLook(null, clock, TURN_TIME);
      aiming = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
    };

    const onPointerLeave = () => {
      pointer = null;
    };

    const aim = () => {
      if (!STATE_BY_ID.get(engine.state)?.baseFace) {
        release();
        return;
      }
      const box = svgRef.current?.getBoundingClientRect();
      if (!box || box.width === 0 || box.height === 0) return;
      if (!aiming) turnSince = clock;
      const halfW = Math.max(1, window.innerWidth / 2);
      const halfH = Math.max(1, window.innerHeight / 2);
      engine.setLook(
        heroLook(
          pointer ? clamp((pointer.x - (box.left + box.width / 2)) / halfW, -1, 1) : 0,
          pointer ? clamp((pointer.y - (box.top + box.height / 2)) / halfH, -1, 1) : 0,
          easings.easeOutQuint(clamp((clock - turnSince) / TURN_TIME)),
          pointer !== null
        ),
        clock
      );
      aiming = true;
    };

    const goToBlock = (index: number) => {
      const block = cycle[index];
      if (!block) {
        nextAt = Infinity;
        return;
      }
      blockIndex = index;
      blockStart = clock;
      if (index === 0) engine.reset(block.state, clock);
      else engine.setState(block.state, clock);
      nextAt = playing ? blockStart + block.duration : Infinity;
    };

    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0;
      last = ms;
      clock += dt;

      if (playing) {
        if (clock >= nextAt && cycle.length) {
          goToBlock((blockIndex + 1) % cycle.length);
        }
      }

      if (follow) aim();
      setFrame(engine.sample(clock));
    };

    if (follow) {
      window.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerleave", onPointerLeave);
    }

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [engine, follow, playing]);

  return (
    <svg
      ref={svgRef}
      className={className}
      width={size}
      height={size}
      viewBox={VIEW}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-VB}
          y={-VB}
          width={VB * 2}
          height={VB * 2}
        >
          <path d={frame.bodyPath} fill="#fff" />
          {frame.eyes.map((eye, i) => (
            <path
              key={i}
              d={eye.d}
              transform={eye.matrix}
              opacity={eye.alpha}
              fill="#000"
            />
          ))}
          {frame.notch ? (
            <circle cx={frame.notch.x} cy={frame.notch.y} r={frame.notch.r} fill="#000" />
          ) : null}
        </mask>
        {frame.arcs.map((arc) => (
          <linearGradient
            key={arc.id}
            id={`${uid}-${arc.id}`}
            gradientUnits="userSpaceOnUse"
            x1={arc.grad.x1}
            y1={arc.grad.y1}
            x2={arc.grad.x2}
            y2={arc.grad.y2}
          >
            {arc.grad.stops.map((stop, i) => (
              <stop
                key={i}
                offset={i / Math.max(1, arc.grad.stops.length - 1)}
                stopColor={stop}
              />
            ))}
          </linearGradient>
        ))}
      </defs>

      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`b${arc.id}`}
            d={arc.back}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>

      {frame.dotsBehind
        ? frame.dots.map((dot, i) => (
            <Dot key={`pb${i}`} dot={dot} ink={color} paper={paper} />
          ))
        : null}

      <g opacity={frame.bodyAlpha}>
        <path d={frame.bodyPath} fill={paper} />
        <g mask={`url(#${maskId})`}>
          <rect x={-VB} y={-VB} width={VB * 2} height={VB * 2} fill={color} />
        </g>
      </g>

      {!frame.dotsBehind
        ? frame.dots.map((dot, i) => (
            <Dot key={`pf${i}`} dot={dot} ink={color} paper={paper} />
          ))
        : null}

      {frame.notif ? (
        <circle
          cx={frame.notif.x}
          cy={frame.notif.y}
          r={frame.notif.r}
          fill={NOTIF_BLUE}
        />
      ) : null}

      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`f${arc.id}`}
            d={arc.front}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>
    </svg>
  );
}

function Dot({
  dot,
  ink,
  paper,
}: {
  dot: BotFrame["dots"][number];
  ink: string;
  paper: string;
}) {
  const fill =
    dot.color ?? (dot.depth === undefined ? ink : mixHex(paper, ink, dot.depth));
  if (dot.d) {
    return (
      <path
        d={dot.d}
        fill={fill}
        opacity={dot.opacity}
        transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${RAYON})`}
      />
    );
  }
  return <circle cx={dot.x} cy={dot.y} r={dot.r} fill={fill} opacity={dot.opacity} />;
}
