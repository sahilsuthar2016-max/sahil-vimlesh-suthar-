/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, ArrowRight } from "lucide-react";
import { ExerciseId, ExerciseSession } from "../types";
import { getSentence } from "../lib/generators";
import { playSuccessSound, playFailureSound, playTickSound } from "../lib/sounds";

interface FlashSentenceProps {
  soundEnabled: boolean;
  autoScale: boolean;
  onSessionComplete: (session: ExerciseSession) => void;
  isGuided?: boolean;
}

export default function FlashSentence({ soundEnabled, autoScale, onSessionComplete, isGuided = false }: FlashSentenceProps) {
  // Settings
  const [wordCount, setWordCount] = useState<number>(5); // starts at 4-5 words
  const [flashDuration, setFlashDuration] = useState<number>(1000); // ms
  const [textStyle, setTextStyle] = useState<string>("simple"); // simple, intermediate, advanced, academic, business, story, science, conversation, news

  // Game State
  const [gameState, setGameState] = useState<"setup" | "countdown" | "flashing" | "input" | "results">("setup");
  const [countdown, setCountdown] = useState<number>(3);
  const [targetSentence, setTargetSentence] = useState<string>("");
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

  // Performance Results
  const [charAccuracy, setCharAccuracy] = useState<number>(0);
  const [wordAccuracy, setWordAccuracy] = useState<number>(0);
  const [missingWords, setMissingWords] = useState<number>(0);
  const [extraWords, setExtraWords] = useState<number>(0);
  const [typingTimeSec, setTypingTimeSec] = useState<number>(0);

  const startExercise = () => {
    setUserInput("");
    // Generate unique sentence using generators library
    const sentence = getSentence(textStyle, wordCount);
    setTargetSentence(sentence);

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

  // Compute metrics comparing strings
  const submitRecall = () => {
    const end = performance.now();
    const durationMs = end - startTimeRef.current;
    const durationSec = durationMs / 1000;
    setTypingTimeSec(durationSec);

    const targetWords = targetSentence.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/);
    const userWords = userInput.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/).filter(Boolean);

    // Compute Word Accuracy, missing words, extra words using set-like differences or Levenshtein-like counts
    let matchCount = 0;
    const matchedIndices = new Set<number>();

    userWords.forEach(uWord => {
      // Find matching word in target that hasn't been matched yet
      const matchIdx = targetWords.findIndex((tWord, tIdx) => tWord === uWord && !matchedIndices.has(tIdx));
      if (matchIdx !== -1) {
        matchCount++;
        matchedIndices.add(matchIdx);
      }
    });

    const calculatedWordAccuracy = targetWords.length > 0 ? (matchCount / targetWords.length) * 100 : 0;
    const calculatedMissing = Math.max(0, targetWords.length - matchCount);
    const calculatedExtra = Math.max(0, userWords.length - matchCount);

    // Compute Character-level Levenshtein similarity or simple sliding windows
    const charAcc = computeCharAccuracy(targetSentence, userInput);

    setCharAccuracy(charAcc);
    setWordAccuracy(calculatedWordAccuracy);
    setMissingWords(calculatedMissing);
    setExtraWords(calculatedExtra);

    const scoreSuccess = calculatedWordAccuracy >= 90 && charAcc >= 85;

    if (soundEnabled) {
      if (scoreSuccess) playSuccessSound();
      else playFailureSound();
    }

    // Auto scale word count on success
    if (autoScale) {
      if (scoreSuccess && wordCount < 30) {
        setWordCount(prev => prev + 1);
      } else if (calculatedWordAccuracy < 60 && wordCount > 4) {
        setWordCount(prev => prev - 1);
      }
    }

    setGameState("results");

    // Save session
    const session: ExerciseSession = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ExerciseId.FLASH_SENTENCE,
      date: new Date().toISOString(),
      durationSec: Math.round(durationSec) || 1,
      accuracy: Math.round((calculatedWordAccuracy + charAcc) / 2),
      reactionTimeMs: durationMs,
      difficulty: wordCount,
      score: Math.round(((calculatedWordAccuracy + charAcc) * 5) + (wordCount * 120) - durationSec),
      details: {
        textStyle,
        wordCount,
        flashDuration,
        targetSentence,
        userInput,
        missingWords: calculatedMissing,
        extraWords: calculatedExtra
      }
    };
    onSessionComplete(session);
  };

  // Quick Character Comparison
  const computeCharAccuracy = (s1: string, s2: string): number => {
    const clean1 = s1.toLowerCase().trim();
    const clean2 = s2.toLowerCase().trim();
    if (!clean1 && !clean2) return 100;
    if (!clean1 || !clean2) return 0;

    let matches = 0;
    const len = Math.max(clean1.length, clean2.length);
    for (let i = 0; i < Math.min(clean1.length, clean2.length); i++) {
      if (clean1[i] === clean2[i]) {
        matches++;
      }
    }
    return (matches / len) * 100;
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl animate-fade-in" id="flash-sentence-container">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-sans">Flash Sentence Recall</h2>
          <p className="text-xs text-zinc-400 mt-1">Enhance photographic word span and structural recall speed</p>
        </div>
        <div className="px-3 py-1 rounded bg-teal-500/10 text-teal-400 text-xs font-mono border border-teal-500/20">
          Exercise 3
        </div>
      </div>

      {gameState === "setup" && (
        <div className="space-y-6">
          <div className="p-4 bg-teal-950/20 border border-teal-800/30 rounded-xl text-zinc-300 text-sm leading-relaxed">
            📖 <strong>Sentence Recall:</strong> A complete, natural English sentence will be flashed. Focus on the vocabulary and syntactic shape. Type back the exact sentence. We will compute character spelling accuracy, missing words, and extras.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Word Count Length</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="4"
                  max="30"
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="flex-1 accent-teal-500"
                />
                <span className="w-10 text-center font-mono text-white font-bold text-sm bg-zinc-800 p-1 rounded">
                  {wordCount}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Flash Duration</label>
              <select
                value={flashDuration}
                onChange={(e) => setFlashDuration(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-teal-500"
              >
                <option value={300}>300 ms (Advanced)</option>
                <option value={500}>500 ms (Fast)</option>
                <option value={750}>750 ms</option>
                <option value={1000}>1.0 second (Medium)</option>
                <option value={1500}>1.5 seconds</option>
                <option value={2000}>2.0 seconds (Easy)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Text Domain Style</label>
              <select
                value={textStyle}
                onChange={(e) => setTextStyle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-teal-500"
              >
                <option value="simple">Simple Kids Story</option>
                <option value="intermediate">Intermediate English</option>
                <option value="advanced">Advanced Prose</option>
                <option value="academic">Academic Journal</option>
                <option value="business">Corporate Strategic</option>
                <option value="story">Literary / Novel</option>
                <option value="news">Journalism / News</option>
                <option value="science">Scientific Theory</option>
                <option value="conversation">Friendly Dialog</option>
              </select>
            </div>
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-6 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-sans font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            id="btn-start-flash-sentence"
          >
            <Play className="w-5 h-5 fill-current" /> Start Flash Sentence
          </button>
        </div>
      )}

      {gameState === "countdown" && (
        <div className="h-64 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold text-teal-400 animate-ping">
            {countdown}
          </span>
          <p className="text-zinc-500 text-sm mt-4 font-mono">Prepare eyes for text flash...</p>
        </div>
      )}

      {gameState === "flashing" && (
        <div className="h-64 flex items-center justify-center px-4">
          <div className="text-lg md:text-xl font-sans font-medium text-center text-white bg-zinc-950 px-6 py-8 rounded-2xl border border-zinc-855 leading-relaxed select-none pointer-events-none max-w-xl shadow-inner">
            {targetSentence}
          </div>
        </div>
      )}

      {gameState === "input" && (
        <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
          <div>
            <label className="text-sm text-zinc-400 font-sans block mb-4 font-medium text-center">
              Type the exact sentence that was flashed:
            </label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Start writing sentence..."
              autoFocus
              rows={3}
              className="w-full bg-zinc-950 border-2 border-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-2xl p-4 font-sans text-lg text-white leading-relaxed focus:outline-none resize-none"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), submitRecall())}
            />
            <p className="text-[11px] text-zinc-500 mt-2 text-right font-mono">Press Enter to Submit</p>
          </div>

          <button
            onClick={submitRecall}
            className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-sans font-semibold rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
            id="btn-submit-flash-sentence"
          >
            Submit Recall <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {gameState === "results" && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-4">
            <div className="text-center">
              <span className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Session Complete</span>
              <div className={`text-5xl font-mono font-black mt-1 ${
                wordAccuracy >= 90 ? "text-emerald-400" : "text-amber-500"
              }`}>
                {wordAccuracy.toFixed(0)}% <span className="text-lg">Word Recall</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono border-t border-b border-zinc-900 py-4 text-center text-zinc-400">
              <div>Char Accuracy: <span className="text-white font-bold">{charAccuracy.toFixed(0)}%</span></div>
              <div>Words Missed: <span className="text-rose-400 font-bold">{missingWords}</span></div>
              <div>Extra Words: <span className="text-amber-500 font-bold">{extraWords}</span></div>
              <div>Time Taken: <span className="text-white font-bold">{typingTimeSec.toFixed(1)}s</span></div>
            </div>

            {/* Compare panel */}
            <div className="space-y-3 pt-2">
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">Flashed Sentence:</span>
                <p className="text-sm text-emerald-400 bg-emerald-950/10 p-3 rounded-lg border border-emerald-950/20 font-medium">
                  {targetSentence}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">Your Recall:</span>
                <p className={`text-sm p-3 rounded-lg border font-medium ${
                  wordAccuracy >= 90 ? "text-white bg-zinc-900 border-zinc-800" : "text-rose-300 bg-rose-950/10 border-rose-950/20"
                }`}>
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
