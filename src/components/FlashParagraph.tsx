/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, ArrowRight } from "lucide-react";
import { ExerciseId, ExerciseSession } from "../types";
import { getParagraph } from "../lib/generators";
import { playSuccessSound, playFailureSound, playTickSound } from "../lib/sounds";

interface FlashParagraphProps {
  soundEnabled: boolean;
  autoScale: boolean;
  onSessionComplete: (session: ExerciseSession) => void;
  isGuided?: boolean;
}

export default function FlashParagraph({ soundEnabled, autoScale, onSessionComplete, isGuided = false }: FlashParagraphProps) {
  // Settings
  const [wordLength, setWordLength] = useState<number>(25); // 25, 50, 75, 100, 150, 200 words
  const [flashDuration, setFlashDuration] = useState<number>(8000); // ms (e.g. 8s, 15s, etc.)
  const [textStyle, setTextStyle] = useState<string>("intermediate");

  // Game state
  const [gameState, setGameState] = useState<"setup" | "countdown" | "flashing" | "input" | "results">("setup");
  const [countdown, setCountdown] = useState<number>(3);
  const [targetParagraph, setTargetParagraph] = useState<string>("");
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

  // Timer reference
  const startTimeRef = useRef<number>(0);

  // Performance metrics
  const [recallAccuracy, setRecallAccuracy] = useState<number>(0);
  const [wordsMissed, setWordsMissed] = useState<number>(0);
  const [wordsAdded, setWordsAdded] = useState<number>(0);
  const [readingWpm, setReadingWpm] = useState<number>(0);

  const startExercise = () => {
    setUserInput("");
    const para = getParagraph(textStyle, wordLength);
    setTargetParagraph(para);

    // Calculate dynamic WPM expectation based on word length and chosen duration
    const wpm = Math.round((wordLength / (flashDuration / 1000)) * 60);
    setReadingWpm(wpm);

    setGameState("countdown");
    setCountdown(3);
  };

  // Countdown
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

  // Flash timer
  useEffect(() => {
    if (gameState === "flashing") {
      const t = setTimeout(() => {
        setGameState("input");
        startTimeRef.current = performance.now();
      }, flashDuration);
      return () => clearTimeout(t);
    }
  }, [gameState, flashDuration]);

  // Compare results
  const submitParagraph = () => {
    const end = performance.now();
    const durationSec = (end - startTimeRef.current) / 1000;

    const targetWords = targetParagraph.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/).filter(Boolean);
    const userWords = userInput.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/).filter(Boolean);

    // Track matching words
    let matchCount = 0;
    const matchedIndices = new Set<number>();

    userWords.forEach(uWord => {
      const matchIdx = targetWords.findIndex((tWord, tIdx) => tWord === uWord && !matchedIndices.has(tIdx));
      if (matchIdx !== -1) {
        matchCount++;
        matchedIndices.add(matchIdx);
      }
    });

    const calculatedRecall = targetWords.length > 0 ? (matchCount / targetWords.length) * 100 : 0;
    const missed = Math.max(0, targetWords.length - matchCount);
    const added = Math.max(0, userWords.length - matchCount);

    setRecallAccuracy(calculatedRecall);
    setWordsMissed(missed);
    setWordsAdded(added);

    if (soundEnabled) {
      if (calculatedRecall >= 70) playSuccessSound();
      else playFailureSound();
    }

    if (autoScale) {
      if (calculatedRecall >= 80 && wordLength < 200) {
        const lengths = [25, 50, 75, 100, 150, 200];
        const nextIdx = lengths.indexOf(wordLength) + 1;
        if (nextIdx < lengths.length) {
          setWordLength(lengths[nextIdx]);
        }
      }
    }

    setGameState("results");

    // Save session
    const session: ExerciseSession = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ExerciseId.FLASH_PARAGRAPH,
      date: new Date().toISOString(),
      durationSec: Math.round(durationSec) || 1,
      accuracy: Math.round(calculatedRecall),
      reactionTimeMs: durationSec * 1000,
      difficulty: wordLength,
      score: Math.round((calculatedRecall * 10) + (wordLength * 8) - durationSec),
      details: {
        textStyle,
        wordLength,
        flashDuration,
        targetParagraph,
        userInput,
        wordsMissed: missed,
        wordsAdded: added,
        estimatedWpm: readingWpm
      }
    };
    onSessionComplete(session);
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl animate-fade-in" id="flash-paragraph-container">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-sans">Flash Paragraph Recall</h2>
          <p className="text-xs text-zinc-400 mt-1">Acclimate prefrontal cortex to semantic chunk mapping</p>
        </div>
        <div className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-mono border border-amber-500/20">
          Exercise 4
        </div>
      </div>

      {gameState === "setup" && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-950/20 border border-amber-800/30 rounded-xl text-zinc-300 text-sm leading-relaxed">
            📝 <strong>Paragraph Recall:</strong> An entire cohesive paragraph will be presented. The reading time is limited—force your eyes to scan in clusters. Afterward, write down all details you remember.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Paragraph Length</label>
              <select
                value={wordLength}
                onChange={(e) => setWordLength(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              >
                <option value={25}>25 Words</option>
                <option value={50}>50 Words</option>
                <option value={75}>75 Words</option>
                <option value={100}>100 Words</option>
                <option value={150}>150 Words (Challenging)</option>
                <option value={200}>200 Words (Expert)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Flash Duration</label>
              <select
                value={flashDuration}
                onChange={(e) => setFlashDuration(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              >
                <option value={3000}>3.0 seconds (Superfast)</option>
                <option value={5000}>5.0 seconds</option>
                <option value={8000}>8.0 seconds</option>
                <option value={12000}>12 seconds (Medium)</option>
                <option value={20000}>20 seconds (Easy)</option>
                <option value={30000}>30 seconds (Novice)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Domain Topic Style</label>
              <select
                value={textStyle}
                onChange={(e) => setTextStyle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              >
                <option value="simple">Simple Children's Garden</option>
                <option value="intermediate">General Knowledge</option>
                <option value="academic">Neuroscience / Academic</option>
                <option value="story">Literary / Story telling</option>
                <option value="news">Journalism News</option>
                <option value="business">Enterprise Strategy</option>
                <option value="science">Physics / Microbiology</option>
                <option value="conversation">Interactive Dialog</option>
              </select>
            </div>
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-sans font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            id="btn-start-flash-paragraph"
          >
            <Play className="w-5 h-5 fill-current" /> Initialize Reading Block
          </button>
        </div>
      )}

      {gameState === "countdown" && (
        <div className="h-64 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold text-amber-400 animate-ping">
            {countdown}
          </span>
          <p className="text-zinc-500 text-sm mt-4 font-mono">Prepare to read...</p>
        </div>
      )}

      {gameState === "flashing" && (
        <div className="py-4 px-2 min-h-64 flex flex-col justify-between">
          <div className="text-sm md:text-base font-sans font-medium text-white bg-zinc-950 px-6 py-8 rounded-2xl border border-zinc-800 leading-relaxed select-none pointer-events-none shadow-inner max-w-xl mx-auto">
            {targetParagraph}
          </div>
          <div className="w-full bg-zinc-950/80 h-1.5 rounded-full mt-6 overflow-hidden border border-zinc-900">
            <div 
              className="bg-amber-500 h-full transition-all linear" 
              style={{ 
                width: "100%", 
                animation: `shrinkWidth ${flashDuration}ms linear forwards` 
              }}
            />
          </div>
          <style>{`
            @keyframes shrinkWidth {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>
      )}

      {gameState === "input" && (
        <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
          <div>
            <label className="text-sm text-zinc-400 font-sans block mb-4 font-medium text-center">
              Write down everything you recall from the paragraph:
            </label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Start drafting paragraph recall..."
              autoFocus
              rows={6}
              className="w-full bg-zinc-950 border-2 border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl p-4 font-sans text-sm text-white leading-relaxed focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={submitParagraph}
            className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-sans font-semibold rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
            id="btn-submit-flash-paragraph"
          >
            Submit Paragraph <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {gameState === "results" && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-4">
            <div className="text-center">
              <span className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Analysis Complete</span>
              <div className={`text-5xl font-mono font-black mt-1 ${
                recallAccuracy >= 75 ? "text-emerald-400" : "text-amber-500"
              }`}>
                {recallAccuracy.toFixed(0)}% <span className="text-lg">Recall Index</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono border-t border-b border-zinc-900 py-4 text-center text-zinc-400">
              <div>Missed: <span className="text-rose-400 font-bold">{wordsMissed} words</span></div>
              <div>Added: <span className="text-amber-500 font-bold">{wordsAdded} words</span></div>
              <div>Reading Target: <span className="text-amber-400 font-bold">{readingWpm} WPM</span></div>
            </div>

            {/* Content reviews */}
            <div className="space-y-3 pt-2">
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">Original Text:</span>
                <p className="text-xs text-emerald-400 bg-emerald-950/10 p-4 rounded-lg border border-emerald-950/20 leading-relaxed font-medium">
                  {targetParagraph}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">Your Reconstructed Text:</span>
                <p className={`text-xs p-4 rounded-lg border leading-relaxed font-medium ${
                  recallAccuracy >= 75 ? "text-white bg-zinc-900 border-zinc-800" : "text-rose-300 bg-rose-950/10 border-rose-950/20"
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
              className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-2xl cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
