"use client";
import { useEffect, useRef, useState, useCallback } from "react";

type Pipe = { x: number; height: number; passed?: boolean };

export default function Home() {
  // state
  const [birdY, setBirdY] = useState(300);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // constants
  const pipeWidth = 120;
  const gap = 280;
  const speed = 5;
  const gravity = 1.4;
  const jumpVel = -16;
  const birdX = 140;
  const birdW = 80;
  const birdH = 80;

  // refs
  const velocityRef = useRef(0);
  const birdYRef = useRef(birdY);
  const pipesRef = useRef<Pipe[]>([]);
  const rafRef = useRef<number | null>(null);
  const spawnCounterRef = useRef(0);

  // preload audio
  const tingRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      tingRef.current = new Audio("/ting.mp3");
      tingRef.current.load();
    }
  }, []);

  // sync refs
  useEffect(() => {
    birdYRef.current = birdY;
  }, [birdY]);
  useEffect(() => {
    pipesRef.current = pipes;
  }, [pipes]);

  // GAME LOOP
  const gameLoop = useCallback(() => {
    velocityRef.current += gravity;
    birdYRef.current += velocityRef.current;

    if (birdYRef.current < 0) {
      birdYRef.current = 0;
      velocityRef.current = 0;
    }
    setBirdY(Math.round(birdYRef.current));

    // move pipes
    setPipes((prev) => {
      let next = prev
        .map((p) => ({ ...p, x: p.x - speed }))
        .filter((p) => p.x > -pipeWidth - 20);

      spawnCounterRef.current++;
      if (spawnCounterRef.current > 100 && typeof window !== "undefined") {
        spawnCounterRef.current = 0;
        const hMin = 100;
        const hMax = Math.max(window.innerHeight - gap - 120, 200);
        const height =
          Math.floor(Math.random() * (hMax - hMin + 1)) + hMin;
        next = [...next, { x: window.innerWidth + 20, height, passed: false }];
      }
      return next;
    });

    // collision + score
    setPipes((prev) =>
      prev.map((p) => {
        const birdTop = birdYRef.current;
        const birdBottom = birdYRef.current + birdH;
        const pipeLeft = p.x;
        const pipeRight = p.x + pipeWidth;
        const inX = pipeRight > birdX && pipeLeft < birdX + birdW;

        if (inX) {
          if (birdTop < p.height || birdBottom > p.height + gap) {
            setGameOver(true);
          }
        }
        if (!p.passed && p.x + pipeWidth < birdX) {
          p.passed = true;
          setScore((s) => s + 1);
          try {
            if (tingRef.current) {
              tingRef.current.currentTime = 0;
              tingRef.current.play();
            }
          } catch {}
        }
        return p;
      })
    );

    // ground
    if (
      typeof window !== "undefined" &&
      birdYRef.current + birdH > window.innerHeight
    ) {
      setGameOver(true);
    }

    if (!gameOver) {
      rafRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [gameOver]);

  // START GAME
  const startGame = useCallback(() => {
    // reset state
    setPipes([]);
    setScore(0);
    setGameOver(false);
    velocityRef.current = 0;
    birdYRef.current = 300;
    setBirdY(300);
    spawnCounterRef.current = 0;

    // clear old loop
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // start new loop
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  // JUMP
  const handleJump = useCallback(() => {
    if (gameOver) {
      startGame();
      return;
    }
    velocityRef.current = jumpVel;
  }, [gameOver, startGame]);

  // mount listener
  useEffect(() => {
    startGame();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleJump();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", handleJump);
    window.addEventListener("mousedown", handleJump);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", handleJump);
      window.removeEventListener("mousedown", handleJump);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleJump, startGame]);

  // pipe image style
  const imageStyleForPipe: React.CSSProperties = {
    width: "80%",
    height: "auto",
    opacity: 0.95,
    pointerEvents: "none",
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(to bottom, #87CEEB, #ffffff)",
        userSelect: "none",
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 50,
        }}
      >
        <img
          src="/logo_sentient.png"
          alt="logo"
          width={56}
          height={56}
          style={{ borderRadius: 8 }}
        />
        <div style={{ fontSize: 28, fontWeight: 700, color: "#ff4081" }}>
          Sentient Flappy Buddy
        </div>
      </div>

      {/* Score */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 28,
          fontWeight: 700,
          color: "#222",
          zIndex: 30,
        }}
      >
        Score: {score}
      </div>

      {/* Bird */}
      <img
        src="/linhvat_sentient.png"
        alt="Buddy"
        draggable={false}
        style={{
          position: "absolute",
          left: birdX,
          top: birdY,
          width: birdW,
          height: birdH,
          transform: `rotate(${Math.max(
            -25,
            Math.min(25, velocityRef.current * 2)
          )}deg)`,
          transition: "transform 60ms linear",
          zIndex: 40,
        }}
      />

      {/* Pipes */}
      {pipes.map((p, i) => (
        <div key={i}>
          {/* Top pipe */}
          <div
            style={{
              position: "absolute",
              left: p.x,
              top: 0,
              width: pipeWidth,
              height: p.height,
              background: "#ff80cb",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              zIndex: 20,
            }}
          >
            <img src="/logo_sentient.png" alt="pipe-logo" style={imageStyleForPipe} />
          </div>

          {/* Bottom pipe */}
          <div
            style={{
              position: "absolute",
              left: p.x,
              top: p.height + gap,
              width: pipeWidth,
              height:
                typeof window !== "undefined"
                  ? window.innerHeight - (p.height + gap)
                  : 300,
              background: "#ff80cb",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              zIndex: 20,
            }}
          >
            <img src="/logo_sentient.png" alt="pipe-logo" style={imageStyleForPipe} />
          </div>
        </div>
      ))}

      {/* Game over overlay */}
      {gameOver && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            zIndex: 60,
            textAlign: "center",
            color: "red",
            fontSize: 36,
            fontWeight: 800,
          }}
        >
          GAME OVER
          <div style={{ fontSize: 24, marginTop: 12, color: "#333" }}>
            (Nhấn Space hoặc click để chơi lại)
          </div>
        </div>
      )}
    </div>
  );
}
