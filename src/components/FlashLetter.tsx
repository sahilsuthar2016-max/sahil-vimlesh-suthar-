/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Play, RotateCcw, Award, CheckCircle2, XCircle, Zap, Flame, Clock, ArrowRight } from "lucide-react";
import { ExerciseId, ExerciseSession } from "../types";
import { playSuccessSound, playFailureSound, playTickSound } from "../lib/sounds";

interface FlashLetterProps {
  soundEnabled: boolean;
  autoScale: boolean;
  onSessionComplete: (session: ExerciseSession) => void;
  isGuided?: boolean;
}

const LETTERS_ALPHABET = "ABCDEFGHJKLMNOPRSTUXYZ"; // Skip easily confused like I, Q, V, W, O

export default function FlashLetter({ soundEnabled, autoScale, onSessionComplete, isGuided = false }: FlashLetterProps) {
  // Settings
  const [numLetters, setNumLetters] = useState<number>(3); // Adaptive starting difficulty: 3 letters
  const [flashDuration, setFlashDuration] = useState<number>(1000); // ms (default 1.0s)

  // Game state
  const [gameState, setGameState] = useState<"setup" | "countdown" | "flashing" | "input" | "results">("setup");
  const [countdown, setCountdown] = useState<number>(3);
  const [targetSequence, setTargetSequence] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");

  // History tracking for adaptive logic
  const [recentScores, setRecentScores] = useState<number[]>([]); // holds accuracies of recent rounds (e.g., [100, 100, 100])
  const [consecutivePerfect, setConsecutivePerfect] = useState<number>(0);
  const [consecutivePoor, setConsecutivePoor] = useState<number>(0);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);

  // Timers and performance tracking
  const startTimeRef = useRef<number>(0);
  const [reactionTime, setReactionTime] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);

  // Auto-advance countdown for results transition
  const [autoAdvanceSec, setAutoAdvanceSec] = useState<number>(4);

  // Input reference
  const inputRef = useRef<HTMLInputElement>(null);

  // Automatic transition for guided workout mode
  useEffect(() => {
    if (isGuided && gameState === "setup") {
      startExercise();
    }
  }, [isGuided, gameState]);

  // Timer for automatic transition to the next round in results screen
  useEffect(() => {
    if (gameState === "results") {
      setAutoAdvanceSec(4);
      const interval = setInterval(() => {
        setAutoAdvanceSec((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            startExercise();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  // Handle focusing the hidden input on the input phase
  useEffect(() => {
    if (gameState === "input") {
      // Focus after a short delay to ensure DOM rendering completes
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Generate target sequence with intelligent randomization
  const generateSequence = (length: number, previousSequence: string) => {
    const letters: string[] = [];
    const prevSet = new Set(previousSequence.split(""));
    
    while (letters.length < length) {
      const randomChar = LETTERS_ALPHABET[Math.floor(Math.random() * LETTERS_ALPHABET.length)];
      // Avoid duplicate letters in the same round
      if (!letters.includes(randomChar)) {
        // Prevent starting with the same character as the previous round
        if (letters.length === 0 && prevSet.has(randomChar) && length > 1) {
          continue;
        }
        letters.push(randomChar);
      }
    }
    return letters.join("");
  };

  const startExercise = () => {
    setLevelUpMessage(null);
    const sequence = generateSequence(numLetters, targetSequence);
    setTargetSequence(sequence);
    setUserInput("");
    setGameState("countdown");
    setCountdown(3);
  };

  // Countdown timer effect
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
  }, [gameState, countdown, soundEnabled]);

  // Flash timer effect
  useEffect(() => {
    if (gameState === "flashing") {
      const t = setTimeout(() => {
        setGameState("input");
        startTimeRef.current = performance.now();
      }, flashDuration);
      return () => clearTimeout(t);
    }
  }, [gameState, flashDuration]);

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, numLetters);
    setUserInput(val);

    // Auto-submit when target length is reached
    if (val.length === numLetters) {
      submitAnswer(val);
    }
  };

  const submitAnswer = (finalInput: string) => {
    const end = performance.now();
    const rt = end - startTimeRef.current;
    setReactionTime(rt);

    // Calculate position-by-position accuracy
    let matches = 0;
    for (let i = 0; i < numLetters; i++) {
      if (finalInput[i] === targetSequence[i]) {
        matches++;
      }
    }

    const calculatedAccuracy = Math.round((matches / numLetters) * 100);
    const roundCorrect = calculatedAccuracy >= 90; // requires 100% for small lists

    setAccuracy(calculatedAccuracy);
    setIsCorrect(roundCorrect);

    if (soundEnabled) {
      if (roundCorrect) playSuccessSound();
      else playFailureSound();
    }

    // Adaptive difficulty progression engine
    let newNumLetters = numLetters;
    if (roundCorrect) {
      const nextPerfect = consecutivePerfect + 1;
      setConsecutivePerfect(nextPerfect);
      setConsecutivePoor(0);

      // Level Up after 3 consecutive successful/perfect rounds
      if (nextPerfect >= 3) {
        newNumLetters = Math.min(10, numLetters + 1);
        setNumLetters(newNumLetters);
        setConsecutivePerfect(0);
        setLevelUpMessage(`🔥 Performance Excellent! Difficulty increased to Level ${newNumLetters - 2} (${newNumLetters} Letters).`);
      }
    } else {
      const nextPoor = consecutivePoor + 1;
      setConsecutivePoor(nextPoor);
      setConsecutivePerfect(0);

      // Level Down if user drops performance (e.g., getting it wrong twice in a row)
      if (nextPoor >= 2) {
        newNumLetters = Math.max(3, numLetters - 1);
        setNumLetters(newNumLetters);
        setConsecutivePoor(0);
        setLevelUpMessage(`📉 Adjusting focus. Difficulty tuned to Level ${newNumLetters - 2} (${newNumLetters} Letters).`);
      }
    }

    setRecentScores((prev) => [...prev.slice(-9), calculatedAccuracy]);
    setGameState("results");

    // Map difficulty metrics & send log session
    const difficultyLevel = numLetters - 2; // Level 1 = 3 letters, Level 2 = 4 letters, etc.
    const scoreVal = Math.round((calculatedAccuracy * 12) + (difficultyLevel * 150) - (rt / 1500));
    
    const session: ExerciseSession = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ExerciseId.FLASH_LETTER,
      date: new Date().toISOString(),
      durationSec: Math.max(1, Math.round(rt / 1000)),
      accuracy: calculatedAccuracy,
      reactionTimeMs: rt,
      difficulty: difficultyLevel,
      score: Math.max(10, scoreVal),
      details: {
        targetSequence,
        userInput: finalInput,
        numLetters,
        flashDuration
      }
    };
    onSessionComplete(session);
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-5 sm:p-8 rounded-3xl shadow-2xl animate-fade-in relative" id="flash-letter-container">
      {/* Exercise Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-serif font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400" />
            Flash Letter Memory
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1">Strengthen working memory capacity and visual sequential processing</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-mono border border-indigo-500/20 font-bold uppercase tracking-wider">
            Level {numLetters - 2} ({numLetters} Letters)
          </span>
        </div>
      </div>

      {/* 1. SETUP STATE */}
      {gameState === "setup" && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-4 bg-indigo-950/20 border border-indigo-800/30 rounded-2xl text-zinc-300 text-xs leading-relaxed space-y-2">
            <p>
              🚀 <strong>How to play:</strong> A randomized sequence of letters will flash on the screen. Visualize and retain their correct horizontal order.
            </p>
            <p className="text-zinc-400">
              When the letters disappear, type the sequence using your keyboard or touch screen. The system automatically verifies your input and scales difficulty dynamically based on your performance.
            </p>
          </div>

          {/* Interactive Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider block mb-1">Starting Level</label>
                <span className="text-sm font-sans font-semibold text-white">Level 1 (3 Letters)</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">Starts friendly, then adapts dynamically to match your memory retention ceiling.</p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-xl">
              <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider block mb-2">Flash Duration</label>
              <select
                value={flashDuration}
                onChange={(e) => setFlashDuration(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={400}>400 ms (Fast Speed)</option>
                <option value={700}>700 ms (Focused)</option>
                <option value={1000}>1.0 Second (Standard)</option>
                <option value={1500}>1.5 Seconds (Lenient)</option>
                <option value={2000}>2.0 Seconds (Novice)</option>
              </select>
            </div>
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-4 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-sans font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
            id="btn-start-flash-letter"
          >
            <Play className="w-4 h-4 fill-current text-white" /> Start Sequence training
          </button>
        </div>
      )}

      {/* 2. COUNTDOWN STATE */}
      {gameState === "countdown" && (
        <div className="h-64 flex flex-col items-center justify-center">
          <span className="text-6xl font-serif font-extrabold text-indigo-400 animate-ping">
            {countdown}
          </span>
          <p className="text-zinc-500 text-xs mt-4 font-mono uppercase tracking-wider animate-pulse">Prepare to focus...</p>
        </div>
      )}

      {/* 3. FLASHING STATE */}
      {gameState === "flashing" && (
        <div className="h-64 flex flex-col items-center justify-center relative overflow-hidden bg-zinc-950/40 border border-zinc-800/40 rounded-2xl p-6">
          {/* Progress bar mapping flash duration */}
          <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 overflow-hidden w-full">
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: flashDuration / 1000, ease: "linear" }}
              className="h-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
            />
          </div>

          {/* Letter sequence */}
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            {targetSequence.split("").map((letter, idx) => (
              <div 
                key={idx}
                className="w-14 h-18 sm:w-16 sm:h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-serif font-black text-white shadow-xl animate-fade-in"
              >
                {letter}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. INPUT STATE */}
      {gameState === "input" && (
        <div className="space-y-6 py-4 animate-fade-in">
          <p className="text-xs text-center text-zinc-400 font-sans font-medium tracking-wide">
            Type the sequence in the exact order it was flashed
          </p>

          {/* Large display boxes representing user typing */}
          <div className="flex items-center justify-center gap-3">
            {Array.from({ length: numLetters }).map((_, idx) => {
              const char = userInput[idx] || "";
              const isActive = userInput.length === idx;
              return (
                <div
                  key={idx}
                  className={`w-12 h-16 sm:w-14 sm:h-18 rounded-2xl border flex items-center justify-center text-2xl font-serif font-bold transition-all duration-150 ${
                    char 
                      ? "bg-zinc-900 border-indigo-500 text-indigo-400 scale-105" 
                      : isActive 
                        ? "bg-zinc-900/80 border-zinc-600 ring-2 ring-indigo-500/20 text-white" 
                        : "bg-zinc-950/60 border-zinc-800/80 text-zinc-700"
                  }`}
                  onClick={() => inputRef.current?.focus()}
                >
                  {char || "_"}
                </div>
              );
            })}
          </div>

          {/* Hidden HTML input for keyboard hook */}
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={handleInputChange}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="absolute opacity-0 -z-50 pointer-events-none"
          />

          <p className="text-[10px] text-center text-zinc-500 font-mono">
            Auto-checking once sequence is complete. Or press Any Key to begin.
          </p>
        </div>
      )}

      {/* 5. RESULTS SCREEN */}
      {gameState === "results" && (
        <div className="space-y-6 animate-fade-in">
          {/* Accuracy display & side-by-side verification */}
          <div className="text-center p-6 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 relative overflow-hidden">
            <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Verification Analysis</span>
            
            <div className="flex items-center justify-center gap-3 mt-3 mb-4">
              {isCorrect ? (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-mono uppercase font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 fill-current" /> Correct Sequence
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-1.5 rounded-full text-xs font-mono uppercase font-bold">
                  <XCircle className="w-3.5 h-3.5" /> Minor Mismatch
                </div>
              )}
            </div>

            {/* Target vs User Input presentation */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/40 max-w-sm mx-auto">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">Correct Answer</span>
                <span className="text-xl font-serif font-black tracking-widest text-indigo-400">{targetSequence}</span>
              </div>
              <div className="hidden sm:block text-zinc-600 font-bold">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">Your Input</span>
                <span className={`text-xl font-serif font-black tracking-widest ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                  {userInput || "---"}
                </span>
              </div>
            </div>

            {/* Stats list */}
            <div className="flex justify-around gap-4 mt-5 max-w-sm mx-auto text-xs font-mono text-zinc-400 border-t border-zinc-900/80 pt-4">
              <div>Accuracy: <span className={`${isCorrect ? "text-emerald-400" : "text-rose-400"} font-bold`}>{accuracy}%</span></div>
              <div>Recall Speed: <span className="text-white font-bold">{(reactionTime / 1000).toFixed(2)}s</span></div>
            </div>
          </div>

          {/* Level Up/Down dynamic notification */}
          {levelUpMessage && (
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3 text-xs text-indigo-300">
              <Award className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{levelUpMessage}</span>
            </div>
          )}

          {/* Multi-round progress stats tracking */}
          <div className="bg-zinc-900/40 border border-zinc-800/40 p-4 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
              <span className="font-sans font-semibold text-zinc-300">Adaptive Progress Tracker</span>
            </div>
            <div className="font-mono text-zinc-400">
              Consecutives: <span className="text-emerald-400 font-bold">{consecutivePerfect}</span>/3 correct
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setGameState("setup")}
              className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-200 font-sans font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Adjust Parameters
            </button>
            <button
              onClick={startExercise}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-indigo-600/20"
            >
              Next Round in {autoAdvanceSec}s <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
