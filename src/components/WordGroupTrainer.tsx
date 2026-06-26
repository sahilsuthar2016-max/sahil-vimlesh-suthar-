/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, ArrowRight } from "lucide-react";
import { ExerciseId, ExerciseSession } from "../types";
import { playSuccessSound, playFailureSound, playTickSound } from "../lib/sounds";

interface WordGroupTrainerProps {
  soundEnabled: boolean;
  autoScale: boolean;
  onSessionComplete: (session: ExerciseSession) => void;
  isGuided?: boolean;
}

const COMMON_WORDS = [
  "apple", "river", "flight", "silver", "mountain", "clock", "garden", "bridge", "forest", "window",
  "castle", "planet", "ocean", "desert", "camera", "mirror", "guitar", "candle", "palace", "winter",
  "summer", "autumn", "spring", "shadow", "valley", "harbor", "island", "jacket", "pencil", "bottle",
  "shield", "hammer", "anchor", "violin", "feather", "rocket", "helmet", "lantern", "temple", "safari"
];

export default function WordGroupTrainer({ soundEnabled, autoScale, onSessionComplete, isGuided = false }: WordGroupTrainerProps) {
  // Settings
  const [wordCount, setWordCount] = useState<number>(3); // 2 to 7 words together
  const [flashDuration, setFlashDuration] = useState<number>(600); // ms

  // Game state
  const [gameState, setGameState] = useState<"setup" | "countdown" | "flashing" | "input" | "results">("setup");
  const [countdown, setCountdown] = useState<number>(3);
  const [targetWords, setTargetWords] = useState<string[]>([]);
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

  // Timers
  const startTimeRef = useRef<number>(0);

  // Performance metrics
  const [accuracy, setAccuracy] = useState<number>(0);
  const [matchedCount, setMatchedCount] = useState<number>(0);
  const [rtMs, setRtMs] = useState<number>(0);

  const startExercise = () => {
    setUserInput("");
    
    // Choose randomized words
    const shuffled = [...COMMON_WORDS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, wordCount);
    setTargetWords(selected);

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
        setGameState("input");
        startTimeRef.current = performance.now();
      }, flashDuration);
      return () => clearTimeout(t);
    }
  }, [gameState, flashDuration]);

  const submitAnswers = () => {
    const end = performance.now();
    const durationMs = end - startTimeRef.current;
    setRtMs(durationMs);

    // Clean user inputs
    const userWords = userInput.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .split(/\s+/)
      .filter(Boolean);

    let matches = 0;
    const targetsSet = new Set(targetWords.map(w => w.toLowerCase()));

    userWords.forEach(word => {
      if (targetsSet.has(word)) {
        matches++;
        targetsSet.delete(word); // ensure unique counting
      }
    });

    const calculatedAccuracy = (matches / wordCount) * 100;
    setMatchedCount(matches);
    setAccuracy(calculatedAccuracy);

    if (soundEnabled) {
      if (calculatedAccuracy >= 90) playSuccessSound();
      else playFailureSound();
    }

    if (autoScale) {
      if (calculatedAccuracy >= 100 && wordCount < 7) {
        setWordCount(prev => prev + 1);
      } else if (calculatedAccuracy < 50 && wordCount > 2) {
        setWordCount(prev => prev - 1);
      }
    }

    setGameState("results");

    // Save stats
    const session: ExerciseSession = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ExerciseId.WORD_GROUP,
      date: new Date().toISOString(),
      durationSec: Math.round(durationMs / 1000) || 1,
      accuracy: calculatedAccuracy,
      reactionTimeMs: durationMs,
      difficulty: wordCount,
      score: Math.round((calculatedAccuracy * 10) + (wordCount * 140) - (durationMs / 1000)),
      details: {
        wordCount,
        flashDuration,
        targetWords,
        userInput
      }
    };
    onSessionComplete(session);
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl animate-fade-in" id="word-group-container">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-sans">Word Group Flash</h2>
          <p className="text-xs text-zinc-400 mt-1">Train ocular saccade widening to capture multiple tokens instantly</p>
        </div>
        <div className="px-3 py-1 rounded bg-teal-500/10 text-teal-400 text-xs font-mono border border-teal-500/20">
          Exercise 8
        </div>
      </div>

      {gameState === "setup" && (
        <div className="space-y-6">
          <div className="p-4 bg-teal-950/20 border border-teal-800/30 rounded-xl text-zinc-300 text-sm leading-relaxed">
            👁️ <strong>Word Group:</strong> A cluster of unrelated words will be flashed simultaneously in a horizontal alignment. Do not scan left-to-right—instead, take an instantaneous mental snapshot of the entire group. Type back the recalled words in any order.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Word Cluster Size</label>
              <div className="grid grid-cols-6 gap-2">
                {[2, 3, 4, 5, 6, 7].map((num) => (
                  <button
                    key={num}
                    onClick={() => setWordCount(num)}
                    className={`p-2 rounded-lg font-mono text-sm border cursor-pointer ${
                      wordCount === num
                        ? "bg-teal-600 border-teal-500 text-white font-bold"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Flash Duration</label>
              <select
                value={flashDuration}
                onChange={(e) => setFlashDuration(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-teal-500"
              >
                <option value={150}>150 ms (Extreme)</option>
                <option value={300}>300 ms (Fast)</option>
                <option value={500}>500 ms (Medium)</option>
                <option value={800}>800 ms (Slow)</option>
                <option value={1200}>1.2 seconds (Novice)</option>
              </select>
            </div>
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-6 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-sans font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            id="btn-start-word-group"
          >
            <Play className="w-5 h-5 fill-current" /> Begin Flash Sequence
          </button>
        </div>
      )}

      {gameState === "countdown" && (
        <div className="h-64 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold text-teal-400 animate-ping">
            {countdown}
          </span>
          <p className="text-zinc-500 text-sm mt-4 font-mono">Expand gaze field...</p>
        </div>
      )}

      {/* Flashing words horizontal block */}
      {gameState === "flashing" && (
        <div className="h-64 flex items-center justify-center bg-zinc-950/80 border border-zinc-850 rounded-2xl p-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 animate-pulse select-none pointer-events-none">
            {targetWords.map((word, idx) => (
              <span key={idx} className="text-xl md:text-3xl font-sans font-black text-white uppercase tracking-tight">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {gameState === "input" && (
        <div className="space-y-6 animate-fade-in max-w-md mx-auto">
          <div>
            <label className="text-sm text-zinc-400 font-sans block mb-4 font-medium text-center">
              Enter the words that were flashed (any order, space separated):
            </label>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="e.g. apple garden river"
              autoFocus
              className="w-full bg-zinc-950 border-2 border-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-2xl p-4 text-center font-sans text-xl text-white focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && submitAnswers()}
            />
          </div>

          <button
            onClick={submitAnswers}
            className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-sans font-semibold rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
            id="btn-submit-word-group"
          >
            Check Word Overlap <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {gameState === "results" && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-4">
            <div className="text-center">
              <span className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Session Complete</span>
              <div className={`text-5xl font-mono font-black mt-1 ${
                accuracy >= 90 ? "text-emerald-400" : accuracy >= 50 ? "text-blue-400" : "text-amber-500"
              }`}>
                {accuracy.toFixed(0)}% <span className="text-lg">Recall</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono border-t border-b border-zinc-900 py-4 text-center text-zinc-400">
              <div>Matched: <span className="text-emerald-400 font-bold">{matchedCount} / {wordCount}</span></div>
              <div>Visual Rate: <span className="text-white font-bold">{flashDuration} ms</span></div>
              <div>Reaction Time: <span className="text-white font-bold">{(rtMs / 1000).toFixed(2)}s</span></div>
            </div>

            {/* comparison list reviews */}
            <div className="space-y-3 pt-2 text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Target Words:</span>
                <div className="flex flex-wrap gap-2">
                  {targetWords.map((word, idx) => (
                    <span key={idx} className="px-2 py-1 rounded bg-emerald-950/20 border border-emerald-950/30 text-emerald-400 uppercase font-bold">
                      {word}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Your Recalled Input:</span>
                <p className="text-zinc-300 p-2.5 rounded bg-zinc-900/60 border border-zinc-900 leading-relaxed font-sans italic">
                  {userInput || "[Empty response]"}
                </p>
              </div>
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
              className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-2xl cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
