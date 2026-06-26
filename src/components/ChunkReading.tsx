/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, FastForward, CheckCircle } from "lucide-react";
import { ExerciseId, ExerciseSession } from "../types";
import { getParagraph } from "../lib/generators";
import { playSuccessSound, playFailureSound, playTickSound } from "../lib/sounds";

interface ChunkReadingProps {
  soundEnabled: boolean;
  autoScale: boolean;
  onSessionComplete: (session: ExerciseSession) => void;
  isGuided?: boolean;
}

interface Question {
  text: string;
  options: string[];
  correct: number;
}

export default function ChunkReading({ soundEnabled, autoScale, onSessionComplete, isGuided = false }: ChunkReadingProps) {
  // Settings
  const [wpm, setWpm] = useState<number>(300); // 200 - 1200
  const [chunkSize, setChunkSize] = useState<number>(3); // 2, 3, 4, 5 words per chunk
  const [textStyle, setTextStyle] = useState<string>("science");

  // Game state
  const [gameState, setGameState] = useState<"setup" | "countdown" | "reading" | "questions" | "results">("setup");
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
  
  // Reading tracker
  const [chunks, setChunks] = useState<string[]>([]);
  const [activeChunkIdx, setActiveChunkIdx] = useState<number>(-1);
  const [fullText, setFullText] = useState<string>("");

  // Comprehension questions (pre-generated or procedurally queried)
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  // Performance metrics
  const [accuracy, setAccuracy] = useState<number>(0);
  const [rtMs, setRtMs] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  // Split a paragraph into chunks of words
  const generateChunks = (text: string, size: number): string[] => {
    const words = text.split(/\s+/);
    const result: string[] = [];
    for (let i = 0; i < words.length; i += size) {
      result.push(words.slice(i, i + size).join(" "));
    }
    return result;
  };

  const startExercise = () => {
    setUserAnswers({});
    const baseText = getParagraph(textStyle, 100); // 100 words paragraph
    setFullText(baseText);

    const generatedChunks = generateChunks(baseText, chunkSize);
    setChunks(generatedChunks);
    setActiveChunkIdx(-1);

    // Setup offline dynamic comprehension questions based on vocabulary keywords in the text
    const lowerText = baseText.toLowerCase();
    let qList: Question[] = [];

    // Create simple content-matching questions
    if (lowerText.includes("respiration") || lowerText.includes("cellular")) {
      qList = [
        {
          text: "What vital chemical compound is synthesized during cellular respiration to fuel metabolic reactions?",
          options: ["Adenosine triphosphate (ATP)", "Carbon Dioxide", "Glucose molecules", "Electromagnetic radiation"],
          correct: 0
        },
        {
          text: "What governs communication bidirectional pathways mentioned in the biological context?",
          options: ["The nervous system", "Tectonic plate stressors", "The gut-brain axis", "Quantum entanglement correlations"],
          correct: 2
        }
      ];
    } else if (lowerText.includes("superconductivity")) {
      qList = [
        {
          text: "What temperature conditions have historically been required for superconductivity?",
          options: ["Extreme high heat", "Absolute zero temperatures", "Standard room temperature", "Warm oceanic climates"],
          correct: 1
        },
        {
          text: "Which particles form paired structures to allow resistance-free atomic lattice flow?",
          options: ["Protons", "Neutrons", "Cooper pairs of electrons", "Hydrogen hydrides"],
          correct: 2
        }
      ];
    } else {
      // General fallback questions
      qList = [
        {
          text: "What was the main focal topic of the reading segment?",
          options: ["Economic transit expansions", "Advanced scientific processes or human systems", "Historical art movements", "Ancient architectural monuments"],
          correct: 1
        },
        {
          text: "Which tone best describes the text domain style?",
          options: ["Informal and conversational", "Highly structured and informative", "Fictional and dramatic", "Poetic and abstract"],
          correct: 1
        }
      ];
    }

    setQuestions(qList);
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
          setGameState("reading");
          setActiveChunkIdx(0);
          startTimeRef.current = performance.now();
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [gameState, countdown]);

  // Chunk slideshow timer based on WPM
  useEffect(() => {
    if (gameState === "reading" && activeChunkIdx >= 0) {
      // Calculate display ms for this specific chunk:
      // (chunk word size / wpm) * 60 * 1000 ms
      const currentChunkWordCount = chunks[activeChunkIdx].split(" ").length;
      const ms = (currentChunkWordCount / wpm) * 60 * 1000;

      // Add small pause if punctuation exists at the end of the chunk
      const hasPunctuation = /[.,!?;:]$/.test(chunks[activeChunkIdx]);
      const duration = hasPunctuation ? ms * 1.4 : ms;

      const t = setTimeout(() => {
        if (activeChunkIdx < chunks.length - 1) {
          setActiveChunkIdx(prev => prev + 1);
        } else {
          setGameState("questions");
        }
      }, duration);

      return () => clearTimeout(t);
    }
  }, [gameState, activeChunkIdx, chunks, wpm]);

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [qIdx]: optIdx
    }));
  };

  const submitQuestions = () => {
    const end = performance.now();
    const durationMs = end - startTimeRef.current;
    setRtMs(durationMs);

    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct) {
        correctCount++;
      }
    });

    const calculatedAccuracy = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
    setAccuracy(calculatedAccuracy);

    if (soundEnabled) {
      if (calculatedAccuracy >= 100) playSuccessSound();
      else playFailureSound();
    }

    // Auto scale chunk sizes and velocity
    if (autoScale) {
      if (calculatedAccuracy >= 100) {
        setWpm(prev => Math.min(1200, prev + 50));
        if (Math.random() > 0.6 && chunkSize < 5) {
          setChunkSize(prev => prev + 1);
        }
      } else if (calculatedAccuracy < 50) {
        setWpm(prev => Math.max(200, prev - 50));
      }
    }

    setGameState("results");

    // Save session
    const session: ExerciseSession = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ExerciseId.CHUNK_READING,
      date: new Date().toISOString(),
      durationSec: Math.round(durationMs / 1000) || 1,
      accuracy: calculatedAccuracy,
      reactionTimeMs: durationMs,
      difficulty: wpm,
      score: Math.round((calculatedAccuracy * 10) + (wpm * 2) + (chunkSize * 100)),
      details: {
        wpm,
        chunkSize,
        textStyle,
        fullText
      }
    };
    onSessionComplete(session);
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl animate-fade-in" id="chunk-reading-container">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-sans">Chunk Reading Trainer</h2>
          <p className="text-xs text-zinc-400 mt-1">Acclimate visual span to process lexical chunks in single fixation points</p>
        </div>
        <div className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20">
          Exercise 6
        </div>
      </div>

      {gameState === "setup" && (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-950/20 border border-emerald-800/30 rounded-xl text-zinc-300 text-sm leading-relaxed">
            ⚡ <strong>Chunk Trainer:</strong> Force your mind to read multiple words concurrently. Instead of individual characters or words, this flashes blocks of phrases. Answer comprehension checks immediately following the text cascade.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Reading Speed (WPM)</label>
              <select
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={200}>200 WPM (Novice)</option>
                <option value={300}>300 WPM (Standard)</option>
                <option value={400}>400 WPM (Comfortable)</option>
                <option value={500}>500 WPM (Intermediate)</option>
                <option value={600}>600 WPM (Fast)</option>
                <option value={800}>800 WPM (Advanced)</option>
                <option value={1000}>1000 WPM (Master)</option>
                <option value={1200}>1200 WPM (Elite)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Chunk Width (Words)</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[2, 3, 4, 5].map((c) => (
                  <button
                    key={c}
                    onClick={() => setChunkSize(c)}
                    className={`p-2.5 rounded font-mono text-xs border cursor-pointer ${
                      chunkSize === c
                        ? "bg-emerald-600 border-emerald-500 text-white font-bold"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {c} w
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Text Domain Topic</label>
              <select
                value={textStyle}
                onChange={(e) => setTextStyle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="science">Scientific Theory</option>
                <option value="academic">Neuroscience Research</option>
                <option value="business">Enterprise Strategies</option>
                <option value="intermediate">General History</option>
                <option value="simple">Simple Narratives</option>
              </select>
            </div>
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-sans font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            id="btn-start-chunk-reading"
          >
            <Play className="w-5 h-5 fill-current" /> Begin Chunk Sequence
          </button>
        </div>
      )}

      {gameState === "countdown" && (
        <div className="h-64 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold text-emerald-400 animate-ping">
            {countdown}
          </span>
          <p className="text-zinc-500 text-sm mt-4 font-mono">Prepare visual registers...</p>
        </div>
      )}

      {/* active reading cascade */}
      {gameState === "reading" && (
        <div className="h-64 flex flex-col justify-center items-center bg-zinc-950/80 rounded-2xl border border-zinc-850 p-6 relative">
          <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider absolute top-4">
            Chunk {activeChunkIdx + 1} of {chunks.length}
          </span>
          
          <div className="text-2xl md:text-3xl font-sans font-black text-center text-white select-none pointer-events-none transition-all duration-75 scale-105">
            {chunks[activeChunkIdx]}
          </div>

          <div className="w-full max-w-sm bg-zinc-900 h-1 rounded-full absolute bottom-4 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-150"
              style={{ width: `${((activeChunkIdx + 1) / chunks.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* comprehension questionnaire panel */}
      {gameState === "questions" && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="text-sm font-semibold uppercase font-mono tracking-wider text-zinc-300 border-b border-zinc-800 pb-2">
            Comprehension Validation Checks
          </h3>
          
          <div className="space-y-6 max-h-[350px] overflow-y-auto pr-1">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="space-y-3 p-4 bg-zinc-950/50 border border-zinc-900 rounded-2xl">
                <p className="text-sm text-white font-sans font-medium">
                  {qIdx + 1}. {q.text}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectAnswer(qIdx, optIdx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                        userAnswers[qIdx] === optIdx
                          ? "bg-emerald-600/20 border-emerald-500 text-white font-bold"
                          : "bg-zinc-900 hover:bg-zinc-800/80 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={submitQuestions}
            disabled={Object.keys(userAnswers).length < questions.length}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-sans font-semibold rounded-2xl shadow-lg cursor-pointer"
            id="btn-submit-chunk-questions"
          >
            Submit Comprehension Score
          </button>
        </div>
      )}

      {/* Results screen */}
      {gameState === "results" && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-4">
            <div className="text-center">
              <span className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Analysis Complete</span>
              <div className={`text-5xl font-mono font-black mt-1 ${
                accuracy >= 90 ? "text-emerald-400" : "text-amber-500"
              }`}>
                {accuracy.toFixed(0)}% <span className="text-lg">Comprehension</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono border-t border-b border-zinc-900 py-4 text-center text-zinc-400">
              <div>Visual Pace: <span className="text-white font-bold">{wpm} WPM</span></div>
              <div>Chunk Width: <span className="text-white font-bold">{chunkSize} words</span></div>
              <div>Reading Efficiency: <span className="text-white font-bold">{Math.round((accuracy / 100) * wpm)} WPM</span></div>
            </div>

            <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-900">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-2">Original Context Read:</span>
              <p className="text-xs text-zinc-300 leading-relaxed italic">
                "{fullText}"
              </p>
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
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
