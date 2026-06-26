/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Target, HelpCircle } from "lucide-react";
import { ExerciseId, ExerciseSession } from "../types";
import { playSuccessSound, playFailureSound, playTickSound } from "../lib/sounds";

interface PeripheralVisionProps {
  soundEnabled: boolean;
  autoScale: boolean;
  onSessionComplete: (session: ExerciseSession) => void;
  isGuided?: boolean;
}

interface FlashedObject {
  char: string;
  colorName: string;
  colorClass: string;
  direction: "North" | "South" | "East" | "West";
  x: number; // offset px
  y: number; // offset px
}

const COLORS = [
  { name: "Red", class: "text-red-500", rgb: "#ef4444" },
  { name: "Green", class: "text-emerald-500", rgb: "#10b981" },
  { name: "Blue", class: "text-blue-500", rgb: "#3b82f6" },
  { name: "Yellow", class: "text-yellow-400", rgb: "#facc15" },
  { name: "Purple", class: "text-purple-500", rgb: "#a855f7" }
];

const DIRECTIONS: ("North" | "South" | "East" | "West")[] = ["North", "South", "East", "West"];

export default function PeripheralVision({ soundEnabled, autoScale, onSessionComplete, isGuided = false }: PeripheralVisionProps) {
  // Settings
  const [distance, setDistance] = useState<number>(100); // radius in px from center
  const [objectCount, setObjectCount] = useState<number>(1); // number of flashed objects
  const [flashDuration, setFlashDuration] = useState<number>(300); // ms

  // Game state
  const [gameState, setGameState] = useState<"setup" | "countdown" | "gaze" | "flashing" | "blank" | "question" | "results">("setup");
  const [countdown, setCountdown] = useState<number>(3);
  const [flashedObjects, setFlashedObjects] = useState<FlashedObject[]>([]);

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
  
  // User answers
  const [userChar, setUserChar] = useState<string>("");
  const [userColor, setUserColor] = useState<string>("");
  const [userDirection, setUserDirection] = useState<string>("");

  // Target metrics
  const [accuracy, setAccuracy] = useState<number>(0);
  const [rtMs, setRtMs] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  const startExercise = () => {
    setUserChar("");
    setUserColor("");
    setUserDirection("");

    // Generate random flashed items
    const possibleChars = "ABKDHFXZ2479";
    const tempObjects: FlashedObject[] = [];
    const usedDirs = new Set<string>();

    for (let i = 0; i < objectCount; i++) {
      const char = possibleChars[Math.floor(Math.random() * possibleChars.length)];
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      
      // Ensure unique directions
      let dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      while (usedDirs.has(dir)) {
        dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      }
      usedDirs.add(dir);

      let x = 0, y = 0;
      if (dir === "North") y = -distance;
      else if (dir === "South") y = distance;
      else if (dir === "East") x = distance;
      else if (dir === "West") x = -distance;

      tempObjects.push({
        char,
        colorName: color.name,
        colorClass: color.class,
        direction: dir,
        x,
        y
      });
    }

    setFlashedObjects(tempObjects);
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
          setGameState("gaze");
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [gameState, countdown]);

  // Gaze preparation timer (keeps the plus sign on screen for 1 second before flashing)
  useEffect(() => {
    if (gameState === "gaze") {
      const t = setTimeout(() => {
        setGameState("flashing");
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [gameState]);

  // Flash duration timer
  useEffect(() => {
    if (gameState === "flashing") {
      const t = setTimeout(() => {
        setGameState("question");
        startTimeRef.current = performance.now();
      }, flashDuration);
      return () => clearTimeout(t);
    }
  }, [gameState, flashDuration]);

  const submitAnswers = () => {
    const end = performance.now();
    const rt = end - startTimeRef.current;
    setRtMs(rt);

    // Score based on identifying the main object (index 0) accurately
    const targetObj = flashedObjects[0];
    let correctPoints = 0;
    let totalPoints = 3;

    if (userChar.toUpperCase().trim() === targetObj.char) correctPoints++;
    if (userColor === targetObj.colorName) correctPoints++;
    if (userDirection === targetObj.direction) correctPoints++;

    const calculatedAccuracy = (correctPoints / totalPoints) * 100;
    setAccuracy(calculatedAccuracy);

    if (soundEnabled) {
      if (calculatedAccuracy === 100) playSuccessSound();
      else playFailureSound();
    }

    // Auto-scale
    if (autoScale) {
      if (calculatedAccuracy === 100) {
        // Increase distance or decrease flash duration
        if (distance < 160) setDistance(prev => prev + 20);
        else if (flashDuration > 150) setFlashDuration(prev => prev - 50);
      } else if (calculatedAccuracy < 34) {
        if (distance > 60) setDistance(prev => prev - 20);
        setFlashDuration(prev => Math.min(600, prev + 50));
      }
    }

    setGameState("results");

    // Record session
    const session: ExerciseSession = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ExerciseId.PERIPHERAL_VISION,
      date: new Date().toISOString(),
      durationSec: Math.round(rt / 1000) || 1,
      accuracy: calculatedAccuracy,
      reactionTimeMs: rt,
      difficulty: distance,
      score: Math.round((calculatedAccuracy * 8) + (distance * 3) - (rt / 1000)),
      details: {
        distance,
        flashDuration,
        targetChar: targetObj.char,
        targetColor: targetObj.colorName,
        targetDirection: targetObj.direction,
        userChar,
        userColor,
        userDirection
      }
    };
    onSessionComplete(session);
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl animate-fade-in" id="peripheral-vision-container">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-sans">Peripheral Vision Trainer</h2>
          <p className="text-xs text-zinc-400 mt-1">Acclimate focus rods to perceive signals outside direct gaze</p>
        </div>
        <div className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs font-mono border border-indigo-500/20">
          Exercise 5
        </div>
      </div>

      {gameState === "setup" && (
        <div className="space-y-6">
          <div className="p-4 bg-indigo-950/20 border border-indigo-800/30 rounded-xl text-zinc-300 text-sm leading-relaxed">
            👁️ <strong>How to train:</strong> Align your focus strictly on the center cross (+) and <strong>never move your eyes</strong>. Symbols (letters/digits) will flash in your periphery. Keep your gaze steady, then state what character, color, and location appeared.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Distance (Radius)</label>
              <select
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={60}>60 px (Narrow / Easy)</option>
                <option value={100}>100 px (Medium)</option>
                <option value={140}>140 px (Wide / Hard)</option>
                <option value={180}>180 px (Extreme Peripheral)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Flashed Elements</label>
              <select
                value={objectCount}
                onChange={(e) => setObjectCount(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>1 Primary Target</option>
                <option value={2}>2 Distractors</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Flash Duration</label>
              <select
                value={flashDuration}
                onChange={(e) => setFlashDuration(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={100}>100 ms (Instantaneous)</option>
                <option value={200}>200 ms (Standard)</option>
                <option value={300}>300 ms (Medium)</option>
                <option value={500}>500 ms (Slow)</option>
                <option value={800}>800 ms (Novice)</option>
              </select>
            </div>
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-sans font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            id="btn-start-peripheral"
          >
            <Play className="w-5 h-5 fill-current" /> Initialize Calibration
          </button>
        </div>
      )}

      {gameState === "countdown" && (
        <div className="h-64 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold text-indigo-400 animate-ping">
            {countdown}
          </span>
          <p className="text-zinc-500 text-sm mt-4 font-mono">Prepare focal gaze...</p>
        </div>
      )}

      {/* Central Fixation Gaze or Flashing block */}
      {(gameState === "gaze" || gameState === "flashing" || gameState === "blank") && (
        <div className="h-80 bg-zinc-950/80 rounded-2xl border border-zinc-850 relative overflow-hidden flex items-center justify-center shadow-inner">
          {/* Central Fixation Cross */}
          <div className="text-4xl text-zinc-500 font-mono font-normal pointer-events-none select-none z-10">
            +
          </div>

          {/* Peripheral Flashing Elements */}
          {gameState === "flashing" && flashedObjects.map((obj, idx) => (
            <div
              key={idx}
              className={`absolute text-2xl font-black font-sans select-none pointer-events-none ${obj.colorClass} ${
                idx > 0 ? "opacity-40 scale-75" : "scale-110 shadow-lg"
              }`}
              style={{
                transform: `translate(${obj.x}px, ${obj.y}px)`
              }}
            >
              {obj.char}
            </div>
          ))}
        </div>
      )}

      {/* Questionnaire Phase */}
      {gameState === "question" && (
        <div className="space-y-6 animate-fade-in max-w-md mx-auto">
          <div className="p-4 bg-indigo-950/20 border border-indigo-800/20 rounded-xl flex items-center gap-2 text-indigo-300 text-xs font-mono">
            <HelpCircle className="w-4 h-4 flex-shrink-0" /> Answer based on the main flashed item.
          </div>

          <div className="space-y-4">
            {/* 1. Character selection */}
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">What was the character?</label>
              <input
                type="text"
                maxLength={1}
                value={userChar}
                onChange={(e) => setUserChar(e.target.value.toUpperCase())}
                placeholder="Type single character (Letter/Digit)"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3 text-center text-lg text-white font-sans font-bold uppercase focus:outline-none"
              />
            </div>

            {/* 2. Color Selection */}
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">What color was it?</label>
              <div className="grid grid-cols-5 gap-2">
                {COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setUserColor(c.name)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      userColor === c.name
                        ? "bg-indigo-600 border-indigo-500 text-white font-bold"
                        : "bg-zinc-800 border-zinc-750 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="block w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: c.rgb }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Location direction selection */}
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">What direction was it located?</label>
              <div className="grid grid-cols-4 gap-2">
                {DIRECTIONS.map(dir => (
                  <button
                    key={dir}
                    onClick={() => setUserDirection(dir)}
                    className={`p-3 rounded-lg border text-xs font-mono font-bold cursor-pointer transition-all ${
                      userDirection === dir
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-zinc-800 border-zinc-750 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={submitAnswers}
            disabled={!userChar || !userColor || !userDirection}
            className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-sans font-semibold rounded-2xl shadow-lg transition-all cursor-pointer"
            id="btn-submit-peripheral"
          >
            Submit Visual Analysis
          </button>
        </div>
      )}

      {/* Results Screen */}
      {gameState === "results" && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-4">
            <div className="text-center">
              <span className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Analysis Complete</span>
              <div className={`text-5xl font-mono font-black mt-1 ${
                accuracy === 100 ? "text-emerald-400" : accuracy >= 50 ? "text-indigo-400" : "text-amber-500"
              }`}>
                {accuracy.toFixed(0)}% <span className="text-lg font-medium">Precision</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono border-t border-b border-zinc-900 py-4 text-center text-zinc-400">
              <div>Radius: <span className="text-white font-bold">{distance} px</span></div>
              <div>Flash Rate: <span className="text-white font-bold">{flashDuration} ms</span></div>
              <div>Reaction Time: <span className="text-white font-bold">{(rtMs / 1000).toFixed(2)}s</span></div>
            </div>

            {/* Target vs user output comparing logs */}
            {flashedObjects.length > 0 && (
              <div className="space-y-3 pt-2 text-xs font-mono">
                <div className="flex justify-between p-3 bg-zinc-900/40 rounded-xl border border-zinc-900">
                  <span className="text-zinc-500">Stimulus Property</span>
                  <span className="text-emerald-400 font-bold">Target</span>
                  <span className="text-indigo-400 font-bold">Your Response</span>
                </div>
                
                <div className="flex justify-between p-2.5 border-b border-zinc-950">
                  <span className="text-zinc-400">Character:</span>
                  <span className="text-white font-bold text-sm">{flashedObjects[0].char}</span>
                  <span className={`font-bold text-sm ${userChar === flashedObjects[0].char ? "text-emerald-400" : "text-rose-400"}`}>{userChar}</span>
                </div>

                <div className="flex justify-between p-2.5 border-b border-zinc-950">
                  <span className="text-zinc-400">Color:</span>
                  <span className="text-white font-bold">{flashedObjects[0].colorName}</span>
                  <span className={`font-bold ${userColor === flashedObjects[0].colorName ? "text-emerald-400" : "text-rose-400"}`}>{userColor}</span>
                </div>

                <div className="flex justify-between p-2.5">
                  <span className="text-zinc-400">Direction Location:</span>
                  <span className="text-white font-bold">{flashedObjects[0].direction}</span>
                  <span className={`font-bold ${userDirection === flashedObjects[0].direction ? "text-emerald-400" : "text-rose-400"}`}>{userDirection}</span>
                </div>
              </div>
            )}
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
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
