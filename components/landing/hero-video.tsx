"use client";

import { useEffect, useRef, useState } from "react";

const SOURCES = {
  webm: "/demo/vesperwise-demo.webm",
  mp4: "/demo/vesperwise-demo.mp4",
  poster: "/demo/poster.jpg",
};

/**
 * Hero product demo: a muted, looping screen recording inside a minimal
 * browser frame. Playback starts only when the video is on screen and the
 * visitor has not asked for reduced motion; it pauses when scrolled away.
 * A visible button lets anyone pause or resume it.
 */
export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPausedRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) userPausedRef.current = true;

    const tryPlay = () => {
      if (userPausedRef.current) return;
      video.play().catch(() => {
        // Autoplay can be blocked (e.g. data saver); the poster and play button remain.
      });
    };

    if (!("IntersectionObserver" in window)) {
      tryPlay();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) tryPlay();
        else if (!video.paused) video.pause();
      },
      { threshold: 0.25 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false;
      video.play().catch(() => {});
    } else {
      userPausedRef.current = true;
      video.pause();
    }
  }

  return (
    <div className="hero-video">
      <div className="hero-video-frame">
        <div className="hero-video-bar" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="hero-video-stage">
          <video
            ref={videoRef}
            className="hero-video-media"
            muted
            loop
            playsInline
            preload="metadata"
            poster={SOURCES.poster}
            width={1600}
            height={900}
            aria-label="Product demo: VesperWise ranks accounts by buying intent and suggests the next step"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src={SOURCES.webm} type="video/webm" />
            <source src={SOURCES.mp4} type="video/mp4" />
          </video>
          <button
            type="button"
            className="hero-video-toggle"
            onClick={toggle}
            aria-label={playing ? "Pause demo video" : "Play demo video"}
            data-playing={playing ? "true" : "false"}
          >
            <svg className="icon-pause" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="4" y="3" width="3" height="10" rx="1" />
              <rect x="9" y="3" width="3" height="10" rx="1" />
            </svg>
            <svg className="icon-play" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M5 3.2v9.6a.8.8 0 0 0 1.2.7l7.6-4.8a.8.8 0 0 0 0-1.4L6.2 2.5A.8.8 0 0 0 5 3.2Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
