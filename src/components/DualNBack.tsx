/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, Square, RotateCcw, Volume2, Key, Info } from "lucide-react";
import { ExerciseId, ExerciseSession } from "../types";
import { speakLetter, playSuccessSound, playFailureSound, playTickSound } from "../lib/sounds";

interface DualNBackProps {
  soundEnabled: boolean;
  onSessionComplete: (session: ExerciseSession) => void;
  isGuided?: boolean;
}

interface TrialStimulus {
  position: number; // 0 - 8 cell index
  letter: string; // e.g. "A", "B", "C", "D", "K", "P", "T", "X"
}

export default function DualNBack({ soundEnabled, onSessionComplete, isGuided = false }: DualNBackProps) {
  // Settings
  const [nParameter, setNParameter] = useState<number>(2); // N=1, N=2, N=3, etc.
  const [totalTrialsCount, setTotalTrialsCount] = useState<number>(20); // standard length
  const [trialIntervalMs, setTrialIntervalMs] = useState<number>(3000); // 3 seconds per step

  // Game state
  const [gameState, setGameState] = useState<"setup" | "countdown" | "running" | "results">("setup");
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
  const [currentTrialIdx, setCurrentTrialIdx] = useState<number>(-1);
  const [stimulusHistory, setStimulusHistory] = useState<TrialStimulus[]>([]);
  
  // Highlighting cell
  const [activeCell, setActiveCell] = useState<number | null>(null);

  // User input responses in current turn
  const [userRespondedPosition, setUserRespondedPosition] = useState<boolean>(false);
  const [userRespondedAudio, setUserRespondedAudio] = useState<boolean>(false);

  // Score keeping
  const [hitsPosition, setHitsPosition] = useState<number>(0);
  const [falseAlarmsPosition, setFalseAlarmsPosition] = useState<number>(0);
  const [hitsAudio, setHitsAudio] = useState<number>(0);
  const [falseAlarmsAudio, setFalseAlarmsAudio] = useState<number>(0);

  // Expected targets count (for accuracy % computation)
  const [targetsPositionCount, setTargetsPositionCount] = useState<number>(0);
  const [targetsAudioCount, setTargetsAudioCount] = useState<number>(0);

  const LETTERS = ["A", "B", "C", "D", "H", "K", "P", "R", "T", "X"];

  // Refs for background loops
  const timerRef = useRef<any>(null);
  const historyRef = useRef<TrialStimulus[]>([]);
  const currentIdxRef = useRef<number>(-1);
  const respondedPositionRef = useRef<boolean>(false);
  const respondedAudioRef = useRef<boolean>(false);

  const startExercise = () => {
    // Reset scores
    setHitsPosition(0);
    setFalseAlarmsPosition(0);
    setHitsAudio(0);
    setFalseAlarmsAudio(0);
    setTargetsPositionCount(0);
    setTargetsAudioCount(0);
    setStimulusHistory([]);
    setActiveCell(null);

    historyRef.current = [];
    currentIdxRef.current = -1;

    // Start countdown
    setGameState("countdown");
    setCountdown(3);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "running") return;
      const key = e.key.toLowerCase();
      if (key === "a" || key === "q") {
        // Position match
        triggerPositionMatch();
      }
      if (key === "l" || key === "p") {
        // Audio match
        triggerAudioMatch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  const triggerPositionMatch = () => {
    if (respondedPositionRef.current) return; // already clicked this turn
    respondedPositionRef.current = true;
    setUserRespondedPosition(true);

    const idx = currentIdxRef.current;
    if (idx < nParameter) {
      // False alarm (not enough history)
      setFalseAlarmsPosition(prev => prev + 1);
    } else {
      const current = historyRef.current[idx];
      const historical = historyRef.current[idx - nParameter];
      if (current.position === historical.position) {
        setHitsPosition(prev => prev + 1);
      } else {
        setFalseAlarmsPosition(prev => prev + 1);
      }
    }
  };

  const triggerAudioMatch = () => {
    if (respondedAudioRef.current) return;
    respondedAudioRef.current = true;
    setUserRespondedAudio(true);

    const idx = currentIdxRef.current;
    if (idx < nParameter) {
      setFalseAlarmsAudio(prev => prev + 1);
    } else {
      const current = historyRef.current[idx];
      const historical = historyRef.current[idx - nParameter];
      if (current.letter === historical.letter) {
        setHitsAudio(prev => prev + 1);
      } else {
        setFalseAlarmsAudio(prev => prev + 1);
      }
    }
  };

  // Countdown timer
  useEffect(() => {
    if (gameState === "countdown") {
      if (soundEnabled) playTickSound();
      const t = setTimeout(() => {
        if (countdown > 1) {
          setCountdown(countdown - 1);
        } else {
          setGameState("running");
          nextTrial();
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [gameState, countdown]);

  // Main Dual N-Back step function
  const nextTrial = () => {
    currentIdxRef.current += 1;
    const nextIdx = currentIdxRef.current;

    if (nextIdx >= totalTrialsCount) {
      finishExercise();
      return;
    }

    // Reset interaction responses
    respondedPositionRef.current = false;
    respondedAudioRef.current = false;
    setUserRespondedPosition(false);
    setUserRespondedAudio(false);
    setActiveCell(null);

    // Generate random position (0-8) and letter
    // To make it a true scientific task, make matching targets occur roughly 30% of the time
    let pos = Math.floor(Math.random() * 9);
    let letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];

    if (nextIdx >= nParameter) {
      const histPos = historyRef.current[nextIdx - nParameter].position;
      const histLetter = historyRef.current[nextIdx - nParameter].letter;

      // Force positional match (30% probability)
      if (Math.random() < 0.3) {
        pos = histPos;
        setTargetsPositionCount(prev => prev + 1);
      }
      // Force audio match (30% probability)
      if (Math.random() < 0.3) {
        letter = histLetter;
        setTargetsAudioCount(prev => prev + 1);
      }
    }

    const currentStimulus: TrialStimulus = { position: pos, letter };
    historyRef.current.push(currentStimulus);
    setStimulusHistory([...historyRef.current]);
    setCurrentTrialIdx(nextIdx);

    // Flash block and vocalize letter
    setTimeout(() => {
      setActiveCell(pos);
      speakLetter(letter, soundEnabled);
    }, 100);

    // Clear active cell highlight after 1s to keep grid clean
    setTimeout(() => {
      setActiveCell(null);
    }, 1000);

    // Queue next trial
    timerRef.current = setTimeout(() => {
      nextTrial();
    }, trialIntervalMs);
  };

  const finishExercise = () => {
    clearTimeout(timerRef.current);
    setGameState("results");

    // Calculate accuracy %: combine position hits + audio hits relative to total targets
    // Hits minus false alarms represents true precision
    const totalPossibleHits = Math.max(1, targetsPositionCount + targetsAudioCount);
    const totalActualHits = hitsPosition + hitsAudio;
    const totalFalseAlarms = falseAlarmsPosition + falseAlarmsAudio;
    
    // Clean positive accuracy percentage
    const finalAccuracy = Math.max(0, Math.round(((totalActualHits - totalFalseAlarms * 0.3) / totalPossibleHits) * 100));

    if (soundEnabled) {
      if (finalAccuracy >= 60) playSuccessSound();
      else playFailureSound();
    }

    // Save session stats
    const session: ExerciseSession = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ExerciseId.DUAL_N_BACK,
      date: new Date().toISOString(),
      durationSec: Math.round((totalTrialsCount * trialIntervalMs) / 1000),
      accuracy: finalAccuracy,
      reactionTimeMs: trialIntervalMs / 2, // abstract average
      difficulty: nParameter,
      score: Math.round((finalAccuracy * 20) + (nParameter * 350)),
      details: {
        nParameter,
        totalTrialsCount,
        hitsPosition,
        hitsAudio,
        falseAlarmsPosition,
        falseAlarmsAudio
      }
    };
    onSessionComplete(session);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl animate-fade-in" id="dual-nback-container">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-sans">Dual N-Back</h2>
          <p className="text-xs text-zinc-400 mt-1">Strengthen fluid intelligence, neuroplasticity, and executive load</p>
        </div>
        <div className="px-3 py-1 rounded bg-violet-500/10 text-violet-400 text-xs font-mono border border-violet-500/20">
          Exercise 10
        </div>
      </div>

      {gameState === "setup" && (
        <div className="space-y-6">
          <div className="p-4 bg-violet-950/20 border border-violet-800/30 rounded-xl text-zinc-300 text-sm leading-relaxed">
            🧠 <strong>Dual N-Back</strong> is a scientifically vetted task proven to expand active working memory and fluid intelligence (IQ).
            <div className="mt-2 text-xs text-zinc-400">
              - **Visual Stimulus**: A blue tile lights up in the 3x3 grid.
              <br />
              - **Auditory Stimulus**: You hear a spoken English letter.
              <br />
              Compare the current stimulus with the one from exactly **{nParameter} steps ago**. Click buttons or use keyboard shortcuts:
              <br />
              - Position Match: **Keyboard A**
              <br />
              - Audio Match: **Keyboard L**
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">N Back value</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNParameter(n)}
                    className={`p-2.5 rounded font-mono text-sm border cursor-pointer ${
                      nParameter === n
                        ? "bg-violet-600 border-violet-500 text-white font-bold"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    N={n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Total Steps / Trials</label>
              <select
                value={totalTrialsCount}
                onChange={(e) => setTotalTrialsCount(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-violet-500"
              >
                <option value={15}>15 Trials</option>
                <option value={20}>20 Trials (Standard)</option>
                <option value={25}>25 Trials</option>
                <option value={30}>30 Trials (Hard)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Speed Pace</label>
              <select
                value={trialIntervalMs}
                onChange={(e) => setTrialIntervalMs(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-violet-500"
              >
                <option value={4000}>4.0 seconds (Slow)</option>
                <option value={3000}>3.0 seconds (Standard)</option>
                <option value={2500}>2.5 seconds (Challenging)</option>
                <option value={2000}>2.0 seconds (Extreme)</option>
              </select>
            </div>
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-6 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-sans font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            id="btn-start-dual-nback"
          >
            <Play className="w-5 h-5 fill-current" /> Initialize Cognitive Stream
          </button>
        </div>
      )}

      {gameState === "countdown" && (
        <div className="h-64 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold text-violet-400 animate-ping">
            {countdown}
          </span>
          <p className="text-zinc-500 text-sm mt-4 font-mono">Prepare auditory and visual buffers...</p>
        </div>
      )}

      {/* Main Dual N back run loop screen */}
      {gameState === "running" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center text-xs font-mono text-zinc-500">
            <span>Trial: {currentTrialIdx + 1} of {totalTrialsCount}</span>
            <span>Focus Parameter: N={nParameter}</span>
          </div>

          {/* 3x3 grid */}
          <div className="flex justify-center py-4">
            <div className="grid grid-cols-3 gap-3 border border-zinc-800 p-4 bg-zinc-950/80 rounded-2xl shadow-inner w-64 h-64 md:w-72 md:h-72">
              {Array.from({ length: 9 }).map((_, cellIdx) => (
                <div
                  key={cellIdx}
                  className={`rounded-xl border transition-all duration-100 ${
                    activeCell === cellIdx
                      ? "bg-violet-500 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.7)]"
                      : "bg-zinc-900 border-zinc-800"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Interactive Response buttons */}
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            {/* 1. Position match */}
            <button
              onClick={triggerPositionMatch}
              className={`p-4 rounded-2xl border text-sm font-sans font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                userRespondedPosition
                  ? "bg-violet-600/20 border-violet-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              <Square className="w-5 h-5 text-violet-400" />
              <span>Match Position</span>
              <span className="text-[10px] font-mono text-zinc-500">[Press Key A]</span>
            </button>

            {/* 2. Audio match */}
            <button
              onClick={triggerAudioMatch}
              className={`p-4 rounded-2xl border text-sm font-sans font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                userRespondedAudio
                  ? "bg-fuchsia-600/20 border-fuchsia-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              <Volume2 className="w-5 h-5 text-fuchsia-400" />
              <span>Match Audio</span>
              <span className="text-[10px] font-mono text-zinc-500">[Press Key L]</span>
            </button>
          </div>
        </div>
      )}

      {/* Results panel */}
      {gameState === "results" && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-4">
            <div className="text-center">
              <span className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Evaluation Complete</span>
              {/* Combine Hits percentage minus False Alarms */}
              <div className="text-5xl font-mono font-black mt-2 text-violet-400">
                {hitsPosition + hitsAudio} <span className="text-lg font-medium text-zinc-500">Hits Registered</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-b border-zinc-900 py-4 text-center text-zinc-400 max-w-sm mx-auto">
              <div>Position Match Hits: <span className="text-emerald-400 font-bold">{hitsPosition}</span></div>
              <div>Position False Alarms: <span className="text-rose-400 font-bold">{falseAlarmsPosition}</span></div>
              <div className="border-t border-zinc-950 pt-2">Audio Match Hits: <span className="text-emerald-400 font-bold">{hitsAudio}</span></div>
              <div className="border-t border-zinc-950 pt-2">Audio False Alarms: <span className="text-rose-400 font-bold">{falseAlarmsAudio}</span></div>
            </div>

            <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-900 text-xs text-zinc-400 flex items-start gap-2 max-w-md mx-auto leading-relaxed">
              <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <span>
                To improve your score further, try increasing N. Practice consistently for 10 minutes daily to stimulate neuroplastic structural reorganization.
              </span>
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
              className="flex-1 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-2xl cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
