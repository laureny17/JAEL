'use client';

import { useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useDetectedPoseStore } from '@/lib/detected-pose-store';
import { calculateAngle, normalizeShoulderAngle } from '@/lib/scoring';

// ---------------------------------------------------------------------------
// Landmark indices (MediaPipe Pose – same numbering as the Python version)
// ---------------------------------------------------------------------------
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_ELBOW = 13;
const R_ELBOW = 14;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 23;
const R_HIP = 24;

const KEY_INDICES = [
  L_SHOULDER, R_SHOULDER, L_ELBOW, R_ELBOW, L_WRIST, R_WRIST, L_HIP, R_HIP,
];

// Arm chains for drawing connections: hip → shoulder → elbow → wrist
const LEFT_CHAIN = [L_HIP, L_SHOULDER, L_ELBOW, L_WRIST];
const RIGHT_CHAIN = [R_HIP, R_SHOULDER, R_ELBOW, R_WRIST];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PoseDetector() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const initStartedRef = useRef(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guard: prevent duplicate getUserMedia calls if the component double-mounts
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;

    async function createLandmarker(
      vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
      delegate: 'GPU' | 'CPU',
    ) {
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate,
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
    }

    async function init() {
      // Fire-and-forget camera — shows feed as soon as device is available.
      // Don't await: a busy/slow camera must not block the model or loop.
      console.log('[PoseDetector] Requesting camera permission…');

      // Enumerate devices first to check camera availability
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === 'videoinput');
        console.log(`[PoseDetector] Found ${cameras.length} camera(s):`, cameras.map((c) => c.label || c.deviceId));
      } catch (e) {
        console.warn('[PoseDetector] Could not enumerate devices:', e);
      }

      // Use a timeout so a hung getUserMedia doesn't silently stall forever
      const cameraTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Camera request timed out after 10s — check browser permissions')), 10_000),
      );

      Promise.race([
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }),
        cameraTimeout,
      ])
        .then(async (stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          const video = videoRef.current!;
          video.srcObject = stream;
          await video.play();
          console.log('[PoseDetector] Camera started —', video.videoWidth, '×', video.videoHeight);
        })
        .catch((err) => {
          console.error('[PoseDetector] Camera access failed:', err);
        });

      // Load model (await this — detection can't run without it)
      try {
        console.log('[PoseDetector] Loading WASM runtime…');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
        );
        if (cancelled) return;
        console.log('[PoseDetector] WASM runtime loaded');

        let landmarker: PoseLandmarker;
        try {
          console.log('[PoseDetector] Creating landmarker (GPU)…');
          landmarker = await createLandmarker(vision, 'GPU');
          console.log('[PoseDetector] GPU landmarker ready');
        } catch (gpuErr) {
          console.warn('[PoseDetector] GPU failed, falling back to CPU:', gpuErr);
          landmarker = await createLandmarker(vision, 'CPU');
          console.log('[PoseDetector] CPU landmarker ready');
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
      } catch (err) {
        console.error('[PoseDetector] Model loading failed:', err);
        return;
      }

      setLoading(false);

      // Start detection loop immediately — the readyState guard inside
      // ensures we only run inference once camera frames are available.
      console.log('[PoseDetector] Entering detection loop (waiting for camera frames…)');

      let lastTime = -1;
      let frameCount = 0;

      function detect() {
        if (cancelled) return;

        const v = videoRef.current;
        if (!v || v.readyState < 2 || !landmarkerRef.current) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        if (v.currentTime !== lastTime) {
          lastTime = v.currentTime;

          try {
            const result = landmarkerRef.current.detectForVideo(
              v,
              performance.now(),
            );

            if (result.landmarks && result.landmarks.length > 0) {
              const lm = result.landmarks[0];

              const leftShoulderAngle = normalizeShoulderAngle(
                lm[L_SHOULDER], lm[L_ELBOW], lm[L_HIP],
              );
              const rightShoulderAngle = normalizeShoulderAngle(
                lm[R_SHOULDER], lm[R_ELBOW], lm[R_HIP],
              );
              const leftElbowAngle = calculateAngle(
                lm[L_SHOULDER], lm[L_ELBOW], lm[L_WRIST],
              );
              const rightElbowAngle = calculateAngle(
                lm[R_SHOULDER], lm[R_ELBOW], lm[R_WRIST],
              );

              useDetectedPoseStore.getState().setDetectedPose({
                leftShoulderAngle,
                rightShoulderAngle,
                leftElbowAngle,
                rightElbowAngle,
              });

              drawOverlay(lm);

              frameCount++;
              if (frameCount === 1) {
                console.log('[PoseDetector] First detection!', {
                  leftShoulderAngle: Math.round(leftShoulderAngle),
                  rightShoulderAngle: Math.round(rightShoulderAngle),
                  leftElbowAngle: Math.round(leftElbowAngle),
                  rightElbowAngle: Math.round(rightElbowAngle),
                });
              }
            }
          } catch (err) {
            console.error('[PoseDetector] Detection error:', err);
          }
        }

        rafRef.current = requestAnimationFrame(detect);
      }

      rafRef.current = requestAnimationFrame(detect);
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Draw the 8 key landmarks + arm chains on the canvas overlay
  // (lightweight manual drawing — no dependency on DrawingUtils)
  // -------------------------------------------------------------------------
  function drawOverlay(lm: { x: number; y: number }[]) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    // Draw arm connection lines
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    for (const chain of [LEFT_CHAIN, RIGHT_CHAIN]) {
      ctx.beginPath();
      ctx.moveTo(lm[chain[0]].x * w, lm[chain[0]].y * h);
      for (let i = 1; i < chain.length; i++) {
        ctx.lineTo(lm[chain[i]].x * w, lm[chain[i]].y * h);
      }
      ctx.stroke();
    }

    // Draw key landmark dots
    ctx.fillStyle = '#FF0000';
    for (const idx of KEY_INDICES) {
      const pt = lm[idx];
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      className="absolute right-12 z-40 overflow-hidden"
      style={{
        bottom: '320px',
        width: '280px',
        height: '170px',
        borderRadius: '12px',
        border: '2px solid #462c2d',
        backgroundColor: '#f8f4f2',
      }}
    >
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 text-xs"
          style={{ color: '#462c2d' }}
        >
          Loading pose model…
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: 'scaleX(-1)' }}
      />
    </div>
  );
}
