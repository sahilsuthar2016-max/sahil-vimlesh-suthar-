/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, ShieldAlert } from "lucide-react";
import { ExerciseId, ExerciseSession } from "../types";
import { playSuccessSound, playFailureSound, playTickSound } from "../lib/sounds";

interface VisualPatternProps {
  soundEnabled: boolean;
  autoScale: boolean;
  onSessionComplete: (session: ExerciseSession) => void;
  isGuided?: boolean;
}

export default function VisualPattern({ soundEnabled, autoScale, onSessionComplete, isGuided = false }: VisualPatternProps) {
  // Settings
  const [gridSize, setGridSize] = useState<number>(4); // 3x3 to 6x6
  const [activeTilesCount, setActiveTilesCount] = useState<number>(5); // count of highlighted tiles
  const [flashDuration, setFlashDuration] = useState<number>(1200); // ms

  // Game state
  const [gameState, setGameState] = useState<"setup" | "countdown" | "flashing" | "recreate" | "results">("setup");
  const [countdown, setCountdown] = useState<number>(3);

  // Automatic transition for guided workout mode
  useEffect(() => {
    if (isGuided && gameState === "setup") {
      startExercise();
    }
  }, [isGuided, gameState]);

  useEffect(() => {
    if (isGuided && gameState === "results") {
      const timer = setTimeout(() => {
        startExercise();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isGuided, gameState]);
  
  // Grid states
  const [targetCells, setTargetCells] = useState<Set<string>>(new Set<string>()); // e.g. "row-col"
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set<string>());
  const [failedClicks, setFailedClicks] = useState<Set<string>>(new Set<string>());

  // Timers
  const startTimeRef = useRef<number>(0);
  const [rtMs, setRtMs] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);

  const startExercise = () => {
    setSelectedCells(new Set<string>());
    setFailedClicks(new Set<string>());

    // Generate random cells
    const newTargets = new Set<string>();
    while (newTargets.size < activeTilesCount) {
      const r = Math.floor(Math.random() * gridSize);
      const c = Math.floor(Math.random() * gridSize);
      newTargets.add(`${r}-${c}`);
    }

    setTargetCells(newTargets);
    setGameState("countdown");
    setCountdown(3);
  };

  // Countdown timer
  useEffect(() => {
    if (gameState === "countdown") {
      if (soundEnabled) playTickSound();
      const t = setTimeout(() => {
        if (countdown > 1) {
          setCountdown(countdown - 1);
        } else {
          setGameState("flashing");
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [gameState, countdown]);

  // Flash duration timer
  useEffect(() => {
    if (gameState === "flashing") {
      const t = setTimeout(() => {
        setGameState("recreate");
        startTimeRef.current = performance.now();
      }, flashDuration);
      return () => clearTimeout(t);
    }
  }, [gameState, flashDuration]);

  // Handle user selecting cells
  const handleCellClick = (row: number, col: number) => {
    if (gameState !== "recreate") return;
    const cellKey = `${row}-${col}`;

    if (targetCells.has(cellKey)) {
      // Correct tile click
      const updated = new Set<string>(selectedCells);
      updated.add(cellKey);
      setSelectedCells(updated);
      
      if (soundEnabled) playSynthClick(600); // high pitched tick

      // Win Condition: All target cells clicked
      if (updated.size === targetCells.size) {
        completeSession(updated, failedClicks);
      }
    } else {
      // Incorrect click (mistake)
      const updatedFailed = new Set<string>(failedClicks);
      updatedFailed.add(cellKey);
      setFailedClicks(updatedFailed);

      if (soundEnabled) playSynthClick(220); // low tone mistake buzz

      // Loss Condition: Too many mistakes (e.g., max 3 mistakes)
      if (updatedFailed.size >= 4) {
        completeSession(selectedCells, updatedFailed);
      }
    }
  };

  // Simple clean click audio synthesizer (prevents delays)
  const playSynthClick = (freq: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (_) {}
  };

  const completeSession = (selected: Set<string>, failed: Set<string>) => {
    const end = performance.now();
    const durationMs = end - startTimeRef.current;
    setRtMs(durationMs);

    // Accuracy is calculated based on: (correct / (total targets + extra failed clicks)) * 100
    const correctCount = selected.size;
    const totalInputClicks = targetCells.size + failed.size;
    const calculatedAccuracy = totalInputClicks > 0 ? (correctCount / totalInputClicks) * 100 : 0;
    
    setAccuracy(calculatedAccuracy);

    if (soundEnabled) {
      if (calculatedAccuracy >= 90) playSuccessSound();
      else playFailureSound();
    }

    // Auto-scale
    if (autoScale) {
      if (calculatedAccuracy >= 90) {
        // Boost active count, possibly grid size
        if (activeTilesCount < gridSize * gridSize - 3) {
          setActiveTilesCount(prev => prev + 1);
        } else if (gridSize < 6) {
          setGridSize(prev => prev + 1);
          setActiveTilesCount(prev => prev + 1);
        }
      } else if (calculatedAccuracy < 50) {
        if (activeTilesCount > 3) setActiveTilesCount(prev => prev - 1);
      }
    }

    setGameState("results");

    // Save session
    const session: ExerciseSession = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ExerciseId.VISUAL_PATTERN,
      date: new Date().toISOString(),
      durationSec: Math.round(durationMs / 1000) || 1,
      accuracy: calculatedAccuracy,
      reactionTimeMs: durationMs,
      difficulty: activeTilesCount,
      score: Math.round((calculatedAccuracy * 15) + (activeTilesCount * 120) - (durationMs / 1000)),
      details: {
        gridSize,
        activeTilesCount,
        flashDuration,
        failedClicksCount: failed.size
      }
    };
    onSessionComplete(session);
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl animate-fade-in" id="visual-pattern-container">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-sans">Visual Pattern Memory</h2>
          <p className="text-xs text-zinc-400 mt-1">Accelerate right-hemisphere spatial indexing and coordinate tracking</p>
        </div>
        <div className="px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20">
          Exercise 9
        </div>
      </div>

      {gameState === "setup" && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-950/20 border border-blue-800/30 rounded-xl text-zinc-300 text-sm leading-relaxed">
            🧊 <strong>Matrix Memory:</strong> A random grid pattern of glowing neon tiles will flash on the screen. Store this exact spatial configuration in your visual buffer. Re-create the pattern by clicking the identical tiles. Avoid clicking incorrect ones!
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Grid Layout</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[3, 4, 5, 6].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      setGridSize(sz);
                      setActiveTilesCount(Math.min(sz * sz - 2, activeTilesCount));
                    }}
                    className={`p-2.5 rounded font-mono text-xs border cursor-pointer ${
                      gridSize === sz
                        ? "bg-blue-600 border-blue-500 text-white font-bold"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {sz}x{sz}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Target Tiles</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="3"
                  max={Math.min(20, gridSize * gridSize - 2)}
                  value={activeTilesCount}
                  onChange={(e) => setActiveTilesCount(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="w-10 text-center font-mono text-white font-bold text-sm bg-zinc-800 p-1.5 rounded">
                  {activeTilesCount}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Flash Duration</label>
              <select
                value={flashDuration}
                onChange={(e) => setFlashDuration(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
              >
                <option value={500}>500 ms (Fast / Speed)</option>
                <option value={800}>800 ms (Challenging)</option>
                <option value={1200}>1.2 seconds (Medium)</option>
                <option value={1800}>1.8 seconds (Slow)</option>
                <option value={2500}>2.5 seconds (Novice)</option>
              </select>
            </div>
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-sans font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            id="btn-start-visual-pattern"
          >
            <Play className="w-5 h-5 fill-current" /> Initialize Grid Blocks
          </button>
        </div>
      )}

      {gameState === "countdown" && (
        <div className="h-64 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold text-blue-400 animate-ping">
            {countdown}
          </span>
          <p className="text-zinc-500 text-sm mt-4 font-mono">Index grid mentally...</p>
        </div>
      )}

      {/* Flashing grid state */}
      {gameState === "flashing" && (
        <div className="flex items-center justify-center py-6">
          <div 
            className="grid gap-2 border border-zinc-800 p-4 bg-zinc-950/80 rounded-2xl shadow-inner select-none pointer-events-none"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: gridSize }).map((_, rIdx) => 
              Array.from({ length: gridSize }).map((_, cIdx) => {
                const isTarget = targetCells.has(`${rIdx}-${cIdx}`);
                return (
                  <div 
                    key={`${rIdx}-${cIdx}`}
                    className={`w-12 h-12 md:w-16 md:h-16 rounded-xl border transition-all duration-300 ${
                      isTarget 
                        ? "bg-blue-500 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]" 
                        : "bg-zinc-900 border-zinc-800"
                    }`}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* User Reconstruct Input Grid */}
      {gameState === "recreate" && (
        <div className="flex flex-col items-center justify-center py-6 animate-fade-in">
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-4">
            Select {targetCells.size} active tiles • {failedClicks.size} / 3 errors max
          </p>

          <div 
            className="grid gap-2 border border-zinc-800 p-4 bg-zinc-950/80 rounded-2xl shadow-inner cursor-pointer"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: gridSize }).map((_, rIdx) => 
              Array.from({ length: gridSize }).map((_, cIdx) => {
                const key = `${rIdx}-${cIdx}`;
                const isClicked = selectedCells.has(key);
                const isFailed = failedClicks.has(key);
                return (
                  <div 
                    key={key}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    className={`w-12 h-12 md:w-16 md:h-16 rounded-xl border transition-all active:scale-95 duration-150 ${
                      isClicked
                        ? "bg-blue-600 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                        : isFailed
                        ? "bg-rose-500/20 border-rose-500 text-rose-500 flex items-center justify-center"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {isFailed && <ShieldAlert className="w-5 h-5 animate-bounce" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Results screen */}
      {gameState === "results" && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800">
            <span className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Analysis Complete</span>
            <div className={`text-5xl font-mono font-black mt-2 ${
              accuracy >= 90 ? "text-emerald-400" : accuracy >= 70 ? "text-blue-400" : "text-amber-500"
            }`}>
              {accuracy.toFixed(0)}% <span className="text-lg">Accuracy</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 max-w-sm mx-auto text-xs font-mono text-zinc-400 border-t border-zinc-900 pt-4">
              <div>Correct Tiles: <span className="text-blue-400 font-bold">{selectedCells.size} / {targetCells.size}</span></div>
              <div>Failed Clicks: <span className="text-rose-400 font-bold">{failedClicks.size}</span></div>
            </div>
          </div>

          {/* Correct pattern overlay comparison */}
          <div className="p-5 bg-zinc-950/40 rounded-2xl border border-zinc-900">
            <h4 className="text-xs uppercase font-mono tracking-wider text-zinc-400 mb-4 text-center">
              Original Pattern Coordinates
            </h4>
            <div className="flex items-center justify-center">
              <div 
                className="grid gap-1.5 border border-zinc-900 p-3 bg-zinc-950 rounded-xl select-none pointer-events-none"
                style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: gridSize }).map((_, rIdx) => 
                  Array.from({ length: gridSize }).map((_, cIdx) => {
                    const key = `${rIdx}-${cIdx}`;
                    const isTarget = targetCells.has(key);
                    const wasCorrectlyClicked = selectedCells.has(key);
                    return (
                      <div 
                        key={key}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-lg border ${
                          isTarget && wasCorrectlyClicked
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                            : isTarget
                            ? "bg-blue-500/20 border-blue-500 text-blue-400"
                            : "bg-zinc-900 border-zinc-950"
                        }`}
                      />
                    );
                  })
                )}
              </div>
            </div>
            <div className="text-[10px] text-zinc-500 mt-3 text-center font-mono">
              Green tiles were successfully recalled; blue tiles represent missed targets.
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setGameState("setup")}
              className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 cursor-pointer border border-zinc-700"
            >
              <RotateCcw className="w-4 h-4" /> Setup
            </button>
            <button
              onClick={startExercise}
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
