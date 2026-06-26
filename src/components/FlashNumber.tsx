/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, ArrowRight, Check } from "lucide-react";
import { ExerciseId, ExerciseSession } from "../types";
import { playSuccessSound, playFailureSound, playTickSound } from "../lib/sounds";

interface FlashNumberProps {
  soundEnabled: boolean;
  autoScale: boolean;
  onSessionComplete: (session: ExerciseSession) => void;
  isGuided?: boolean;
}

export default function FlashNumber({ soundEnabled, autoScale, onSessionComplete, isGuided = false }: FlashNumberProps) {
  // Settings
  const [digitLength, setDigitLength] = useState<number>(4); // initial difficulty length
  const [flashDuration, setFlashDuration] = useState<number>(1000); // ms
  const [gameMode, setGameMode] = useState<"sequence" | "grid">("sequence");

  // Game state
  const [gameState, setGameState] = useState<"setup" | "countdown" | "flashing" | "input" | "results">("setup");
  const [countdown, setCountdown] = useState<number>(3);
  const [sequence, setSequence] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");

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

  // Grid sub-mode state
  const [gridSize, setGridSize] = useState<number>(3);
  const [grid, setGrid] = useState<number[][]>([]);
  const [gridCounts, setGridCounts] = useState<Record<number, number>>({});
  const [userGridCounts, setUserGridCounts] = useState<Record<number, string>>({});
  const [uniqueDigits, setUniqueDigits] = useState<number[]>([]);

  // Timers
  const startTimeRef = useRef<number>(0);

  // Performance metrics
  const [accuracy, setAccuracy] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [reactionTime, setReactionTime] = useState<number>(0);

  const startExercise = () => {
    setUserInput("");
    if (gameMode === "sequence") {
      // Generate random digits
      let seq = "";
      for (let i = 0; i < digitLength; i++) {
        seq += Math.floor(Math.random() * 10).toString();
      }
      setSequence(seq);
    } else {
      // Grid mode
      const tempGrid: number[][] = [];
      const counts: Record<number, number> = {};
      const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => 0.5 - Math.random()).slice(0, 3); // 3 unique digits
      setUniqueDigits(pool);
      pool.forEach(d => { counts[d] = 0; });

      for (let r = 0; r < gridSize; r++) {
        const row: number[] = [];
        for (let c = 0; c < gridSize; c++) {
          const d = pool[Math.floor(Math.random() * pool.length)];
          row.push(d);
          counts[d] = (counts[d] || 0) + 1;
        }
        tempGrid.push(row);
      }
      setGrid(tempGrid);
      setGridCounts(counts);

      const blankInputs: Record<number, string> = {};
      pool.forEach(d => { blankInputs[d] = ""; });
      setUserGridCounts(blankInputs);
    }

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
      const duration = gameMode === "sequence" ? flashDuration : flashDuration * 1.5;
      const t = setTimeout(() => {
        setGameState("input");
        startTimeRef.current = performance.now();
      }, duration);
      return () => clearTimeout(t);
    }
  }, [gameState, flashDuration, gameMode]);

  const submitSequence = () => {
    const end = performance.now();
    const rt = end - startTimeRef.current;
    setReactionTime(rt);

    let calculatedAccuracy = 0;

    if (gameMode === "sequence") {
      let matches = 0;
      const cleanInput = userInput.trim();
      const maxLen = Math.max(sequence.length, cleanInput.length);

      for (let i = 0; i < sequence.length; i++) {
        if (cleanInput[i] === sequence[i]) {
          matches++;
        }
      }

      calculatedAccuracy = maxLen > 0 ? (matches / maxLen) * 100 : 0;
      const success = cleanInput === sequence;
      setIsSuccess(success);
      setAccuracy(calculatedAccuracy);

      if (soundEnabled) {
        if (success) playSuccessSound();
        else playFailureSound();
      }

      // Auto-scaling: If sequence matched perfectly, increase sequence length automatically
      if (success) {
        setDigitLength(prev => prev + 1);
      } else if (calculatedAccuracy < 50 && digitLength > 3) {
        setDigitLength(prev => prev - 1);
      }
    } else {
      // Grid counting accuracy
      let totalDiff = 0;
      let totalCells = gridSize * gridSize;
      uniqueDigits.forEach(d => {
        const userVal = parseInt(userGridCounts[d]) || 0;
        const actualVal = gridCounts[d] || 0;
        totalDiff += Math.abs(userVal - actualVal);
      });
      calculatedAccuracy = Math.max(0, 100 - (totalDiff / totalCells) * 100);
      setIsSuccess(calculatedAccuracy >= 90);
      setAccuracy(calculatedAccuracy);

      if (soundEnabled) {
        if (calculatedAccuracy >= 90) playSuccessSound();
        else playFailureSound();
      }

      if (autoScale) {
        if (calculatedAccuracy >= 90 && gridSize < 6) {
          setGridSize(prev => prev + 1);
        } else if (calculatedAccuracy < 60 && gridSize > 3) {
          setGridSize(prev => prev - 1);
        }
      }
    }

    setGameState("results");

    // Save session
    const finalDiff = gameMode === "sequence" ? digitLength : gridSize;
    const session: ExerciseSession = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ExerciseId.FLASH_NUMBER,
      date: new Date().toISOString(),
      durationSec: Math.round(rt / 1000) || 1,
      accuracy: calculatedAccuracy,
      reactionTimeMs: rt,
      difficulty: finalDiff,
      score: Math.round((calculatedAccuracy * 15) + (finalDiff * 100) - (rt / 1000)),
      details: {
        gameMode,
        digitLength,
        gridSize,
        sequence,
        userInput
      }
    };
    onSessionComplete(session);
  };

  const handleGridInputChange = (digit: number, value: string) => {
    setUserGridCounts(prev => ({
      ...prev,
      [digit]: value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl animate-fade-in" id="flash-number-container">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-sans">Flash Number Memory</h2>
          <p className="text-xs text-zinc-400 mt-1">Accelerate digit recall span and spatial pattern retention</p>
        </div>
        <div className="px-3 py-1 rounded bg-rose-500/10 text-rose-400 text-xs font-mono border border-rose-500/20">
          Exercise 2
        </div>
      </div>

      {gameState === "setup" && (
        <div className="space-y-6">
          <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
            <button
              onClick={() => setGameMode("sequence")}
              className={`flex-1 py-2 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                gameMode === "sequence" 
                  ? "bg-zinc-800 text-white font-bold" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Sequence Mode (Digit Span)
            </button>
            <button
              onClick={() => setGameMode("grid")}
              className={`flex-1 py-2 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                gameMode === "grid" 
                  ? "bg-zinc-800 text-white font-bold" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Spatial Grid Mode
            </button>
          </div>

          <div className="p-4 bg-rose-950/20 border border-rose-800/30 rounded-xl text-zinc-300 text-sm leading-relaxed">
            {gameMode === "sequence" ? (
              <span>
                🔢 <strong>Digit Span:</strong> A sequence of random digits will flash on screen. When it disappears, type the exact sequence from memory. Accuracy is calculated digit-by-digit, and the sequence length will <strong>automatically grow</strong> upon flawless recreation!
              </span>
            ) : (
              <span>
                🧩 <strong>Spatial Grid:</strong> A grid of randomized digits will flash briefly. Once blanked, input how many times each unique digit appeared. Do not count individually — grasp the visual layout instantly!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gameMode === "sequence" ? (
              <div>
                <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Initial Digit Count</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={digitLength}
                    onChange={(e) => setDigitLength(Number(e.target.value))}
                    className="flex-1 accent-rose-500"
                  />
                  <span className="w-10 text-center font-mono text-white font-bold text-sm bg-zinc-800 p-1 rounded">
                    {digitLength}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Grid Size</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 4, 5, 6].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGridSize(g)}
                      className={`p-2 rounded font-mono text-xs border cursor-pointer ${
                        gridSize === g
                          ? "bg-rose-600 border-rose-500 text-white font-bold"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {g}x{g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Flash Duration</label>
              <select
                value={flashDuration}
                onChange={(e) => setFlashDuration(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-rose-500"
              >
                <option value={100}>100 ms (Extreme)</option>
                <option value={300}>300 ms (Speed)</option>
                <option value={500}>500 ms (Hard)</option>
                <option value={1000}>1.0 second (Medium)</option>
                <option value={2000}>2.0 seconds (Easy)</option>
                <option value={3000}>3.0 seconds (Novice)</option>
              </select>
            </div>
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-6 py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-sans font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            id="btn-start-flash-number"
          >
            <Play className="w-5 h-5 fill-current" /> Start Training Block
          </button>
        </div>
      )}

      {gameState === "countdown" && (
        <div className="h-64 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold text-rose-400 animate-ping">
            {countdown}
          </span>
          <p className="text-zinc-500 text-sm mt-4 font-mono">Prepare to memorize digits...</p>
        </div>
      )}

      {gameState === "flashing" && (
        <div className="h-64 flex items-center justify-center">
          {gameMode === "sequence" ? (
            <div className="text-4xl md:text-5xl font-mono font-black tracking-widest text-white bg-zinc-950 px-8 py-5 rounded-2xl border border-zinc-800 animate-pulse select-none pointer-events-none">
              {sequence}
            </div>
          ) : (
            <div 
              className="grid gap-2 border border-zinc-800 p-4 bg-zinc-950/80 rounded-2xl shadow-inner select-none pointer-events-none"
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
            >
              {grid.map((row, rIdx) => 
                row.map((cell, cIdx) => (
                  <div 
                    key={`${rIdx}-${cIdx}`}
                    className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-zinc-900 border border-zinc-800 text-white text-xl md:text-2xl font-mono font-bold rounded-xl"
                  >
                    {cell}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {gameState === "input" && (
        <div className="space-y-6 animate-fade-in max-w-md mx-auto">
          {gameMode === "sequence" ? (
            <div className="text-center">
              <label className="text-sm text-zinc-400 font-sans block mb-4 font-medium">
                Enter the exact sequence of numbers flashed:
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Type digits here"
                autoFocus
                className="w-full bg-zinc-950 border-2 border-zinc-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-2xl p-4 text-center font-mono font-black text-3xl text-white tracking-widest focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && submitSequence()}
              />
            </div>
          ) : (
            <div>
              <p className="text-sm text-center text-zinc-400 font-sans font-medium mb-6">
                How many times did each digit appear in the grid?
              </p>
              <div className="grid grid-cols-1 gap-4">
                {uniqueDigits.map(digit => (
                  <div 
                    key={digit}
                    className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <span className="text-2xl font-bold font-mono text-rose-400">Digit {digit}</span>
                    <input
                      type="number"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={userGridCounts[digit] || ""}
                      onChange={(e) => handleGridInputChange(digit, e.target.value)}
                      placeholder="?"
                      className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-center text-lg text-white font-mono font-bold focus:outline-none focus:border-rose-500"
                      onKeyDown={(e) => e.key === "Enter" && submitSequence()}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={submitSequence}
            className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-sans font-semibold rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
            id="btn-submit-flash-number"
          >
            Submit Answer <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {gameState === "results" && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800">
            <span className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Session Complete</span>
            <div className={`text-5xl font-mono font-black mt-2 ${
              isSuccess ? "text-emerald-400" : "text-amber-500"
            }`}>
              {accuracy.toFixed(0)}% <span className="text-lg">Accuracy</span>
            </div>
            
            <div className="mt-4 text-xs font-mono text-zinc-400 border-t border-zinc-900 pt-4 max-w-sm mx-auto">
              {gameMode === "sequence" ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Flashed Sequence:</span>
                    <span className="text-white font-bold font-mono tracking-widest">{sequence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Your Answer:</span>
                    <span className={`font-bold font-mono tracking-widest ${isSuccess ? "text-emerald-400" : "text-rose-400"}`}>
                      {userInput || "[Empty]"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-900 pt-2 text-zinc-500">
                    <span>Next level auto-scaling:</span>
                    <span className="text-zinc-300 font-bold">{digitLength} Digits</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>Status: <span className={isSuccess ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{isSuccess ? "Mastered" : "Incomplete"}</span></div>
                  <div>Reaction Time: <span className="text-white font-bold">{(reactionTime / 1000).toFixed(2)}s</span></div>
                </div>
              )}
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
              className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-2xl cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
