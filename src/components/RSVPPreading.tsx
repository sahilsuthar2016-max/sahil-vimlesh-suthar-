/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, AlertTriangle, CheckCircle } from "lucide-react";
import { ExerciseId, ExerciseSession } from "../types";
import { playSuccessSound, playFailureSound, playTickSound } from "../lib/sounds";

interface RSVPPreadingProps {
  soundEnabled: boolean;
  autoScale: boolean;
  onSessionComplete: (session: ExerciseSession) => void;
  isGuided?: boolean;
}

interface Article {
  title: string;
  category: string;
  text: string;
  questions: {
    text: string;
    options: string[];
    correct: number;
  }[];
}

const ARTICLES: Article[] = [
  {
    title: "Neuroplasticity in Adult Brains",
    category: "Science",
    text: "For generations, scientists believed the adult human brain was rigid and incapable of growth. However, modern neuroscience has debunked this myth through the discovery of neuroplasticity. Neuroplasticity refers to the brain's ability to reorganize itself by forming new neural connections throughout life. This adaptation occurs in response to learning, sensory stimulation, or even physical injuries. When you engage in intense cognitive exercise, electrical signals travel across synapses, stimulating structural remodeling of prefrontal networks. This process increases dendritic branching, solidifies memory pathways, and elevates overall processing speeds.",
    questions: [
      {
        text: "What does the scientific term 'neuroplasticity' mean?",
        options: [
          "The brain's inability to adapt under stress",
          "The chemical decomposition of cranial cells",
          "The brain's ability to reorganize itself by creating new neural pathways",
          "An age-related loss of working memory capacity"
        ],
        correct: 2
      },
      {
        text: "According to the article, what triggers the structural remodeling of prefrontal networks?",
        options: [
          "Physical inactivity and rest",
          "Electrical signals traversing synapses during intense cognitive exercise",
          "Consuming rich glucose solutions",
          "A complete lack of sensory stimulation"
        ],
        correct: 1
      },
      {
        text: "What was the historical belief regarding adult brains mentioned in the text?",
        options: [
          "That adult brains were highly malleable and growing",
          "That adult brains were rigid and incapable of structural growth",
          "That children had poorer neural connectivity than adults",
          "That memory storage limits were infinite in nature"
        ],
        correct: 1
      }
    ]
  },
  {
    title: "Quantum Superposition & Computing",
    category: "Technology",
    text: "Traditional digital computers represent data using binary bits, which exist in a state of either zero or one. Quantum computers, conversely, harness qubits that exploit quantum superposition. Superposition is a fundamental principle of physics allowing a particle to exist in multiple states simultaneously. To comprehend this, imagine a spinning coin that represents both heads and tails until caught. This quantum capability permits computers to calculate millions of mathematical possibilities concurrently. Consequently, systems can resolve highly complex cryptography, molecular modeling, and logistical problems at velocities billions of times faster than modern silicon supercomputers.",
    questions: [
      {
        text: "What is the key state difference between traditional bits and quantum qubits?",
        options: [
          "Bits operate purely analog, while qubits operate digitally",
          "Bits are either zero or one, while qubits exploit simultaneous superposition",
          "Bits transmit signals faster than light speeds",
          "Qubits are entirely mechanical gears"
        ],
        correct: 1
      },
      {
        text: "What analogy is used to describe the concept of quantum superposition?",
        options: [
          "An ancient grandfather clock ticking",
          "A spinning coin representing heads and tails simultaneously",
          "A light bulb being switched on or off",
          "A telescope searching deep interstellar space"
        ],
        correct: 1
      },
      {
        text: "Which of the following problems can quantum computers resolve exceptionally fast?",
        options: [
          "Socio-economic housing layout designs",
          "Simple addition worksheets",
          "Highly complex cryptography and molecular modeling",
          "Basic database formatting"
        ],
        correct: 2
      }
    ]
  },
  {
    title: "The Mechanics of Global Inflation",
    category: "Economics",
    text: "Inflation represents the rate at which the general level of prices for goods and services rises, subsequently eroding currency purchasing power. Central banking authorities manage inflation by adjusting interest rates. When inflation trends upward too rapidly, banks raise lending rates to reduce capital velocity and cool economic spending. Conversely, during recessions, banks lower rates to stimulate commercial investment. Balancing this delicate monetary policy is highly critical; excessive money supply triggers hyperinflation, while stagnant cash flow precipitates deep deflationary depression.",
    questions: [
      {
        text: "What is the economic definition of inflation described in the article?",
        options: [
          "The rapid expansion of global stock indices",
          "The rate at which prices rise, eroding purchasing power",
          "The physical resizing of bank vaults",
          "An increase in regional employment statistics"
        ],
        correct: 1
      },
      {
        text: "How do central banks respond to rapid inflationary trends?",
        options: [
          "By printing currency and distributing physical cash",
          "By raising lending rates to reduce capital velocity",
          "By completely closing international stock exchanges",
          "By decreasing tax rates for corporations"
        ],
        correct: 1
      },
      {
        text: "What danger occurs if the money supply is increased excessively?",
        options: [
          "Deep deflationary depression",
          "Hyperinflation",
          "Consistent economic stability",
          "A sudden decline in national populations"
        ],
        correct: 1
      }
    ]
  }
];

export default function RSVPPreading({ soundEnabled, autoScale, onSessionComplete, isGuided = false }: RSVPPreadingProps) {
  // Settings
  const [wpm, setWpm] = useState<number>(400); // 200 - 2000
  const [selectedArticleIdx, setSelectedArticleIdx] = useState<number>(0);

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
        // Increment article to read something different
        setSelectedArticleIdx((prev) => (prev + 1) % ARTICLES.length);
        startExercise();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isGuided, gameState]);
  
  // RSVP word lists
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIdx, setCurrentWordIdx] = useState<number>(-1);

  // Comprehension questions
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [accuracy, setAccuracy] = useState<number>(0);
  const [rtMs, setRtMs] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  const startExercise = () => {
    setUserAnswers({});
    const articleText = ARTICLES[selectedArticleIdx].text;
    const splitWords = articleText.split(/\s+/);
    setWords(splitWords);
    setCurrentWordIdx(-1);

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
          setCurrentWordIdx(0);
          startTimeRef.current = performance.now();
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [gameState, countdown]);

  // RSVP slideshow timer
  useEffect(() => {
    if (gameState === "reading" && currentWordIdx >= 0) {
      const baseMs = (60 / wpm) * 1000;
      const currentWord = words[currentWordIdx];
      
      // Calculate punctuation pauses (delays)
      let delay = baseMs;
      if (/[.,!?;:]$/.test(currentWord)) {
        delay = baseMs * 1.8; // pause longer on punctuation
      }

      const t = setTimeout(() => {
        if (currentWordIdx < words.length - 1) {
          setCurrentWordIdx(prev => prev + 1);
        } else {
          setGameState("questions");
        }
      }, delay);

      return () => clearTimeout(t);
    }
  }, [gameState, currentWordIdx, words, wpm]);

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

    const article = ARTICLES[selectedArticleIdx];
    let correctCount = 0;
    article.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct) {
        correctCount++;
      }
    });

    const calculatedAccuracy = (correctCount / article.questions.length) * 100;
    setAccuracy(calculatedAccuracy);

    if (soundEnabled) {
      if (calculatedAccuracy >= 100) playSuccessSound();
      else playFailureSound();
    }

    // Auto-scale speed
    if (autoScale) {
      if (calculatedAccuracy >= 100) {
        setWpm(prev => Math.min(2000, prev + 100));
      } else if (calculatedAccuracy < 66) {
        setWpm(prev => Math.max(200, prev - 100));
      }
    }

    setGameState("results");

    // Save session
    const session: ExerciseSession = {
      id: Math.random().toString(36).substring(2, 9),
      exerciseId: ExerciseId.RSVP_SPEED_READING,
      date: new Date().toISOString(),
      durationSec: Math.round(durationMs / 1000) || 1,
      accuracy: calculatedAccuracy,
      reactionTimeMs: durationMs,
      difficulty: wpm,
      score: Math.round((calculatedAccuracy * 12) + (wpm * 2.5)),
      details: {
        wpm,
        articleTitle: article.title,
        correctCount
      }
    };
    onSessionComplete(session);
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-3xl shadow-2xl animate-fade-in" id="rsvp-reading-container">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-sans">RSVP Speed Reading</h2>
          <p className="text-xs text-zinc-400 mt-1">Acclimate focus point to ingest symbols without sub-vocalization</p>
        </div>
        <div className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs font-mono border border-indigo-500/20">
          Exercise 7
        </div>
      </div>

      {gameState === "setup" && (
        <div className="space-y-6">
          <div className="p-4 bg-indigo-950/20 border border-indigo-800/30 rounded-xl text-zinc-300 text-sm leading-relaxed">
            🚀 <strong>RSVP Training:</strong> Rapid Serial Visual Presentation shows words sequentially in a fixed center location. This completely eliminates backward eye-scanning and minimizes sub-vocalization. Maintain concentration, then answer comprehension questions.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Select Article Segment</label>
              <select
                value={selectedArticleIdx}
                onChange={(e) => setSelectedArticleIdx(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-sans text-white focus:outline-none focus:border-indigo-500"
              >
                {ARTICLES.map((art, idx) => (
                  <option key={idx} value={idx}>
                    [{art.category}] {art.title} ({art.text.split(" ").length} words)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase font-mono block mb-2">Target Speed (WPM)</label>
              <select
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
              >
                {[200, 300, 400, 500, 600, 700, 800, 1000, 1200, 1500, 1800, 2000].map(val => (
                  <option key={val} value={val}>{val} WPM {val >= 1000 ? "(Superhuman)" : ""}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={startExercise}
            className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-sans font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            id="btn-start-rsvp"
          >
            <Play className="w-5 h-5 fill-current" /> Begin Rapid Serial Stream
          </button>
        </div>
      )}

      {gameState === "countdown" && (
        <div className="h-64 flex flex-col items-center justify-center">
          <span className="text-6xl font-mono font-bold text-indigo-400 animate-ping">
            {countdown}
          </span>
          <p className="text-zinc-500 text-sm mt-4 font-mono">Affix eyes to center...</p>
        </div>
      )}

      {/* RSVP Word Presentation */}
      {gameState === "reading" && (
        <div className="h-64 flex flex-col justify-center items-center bg-zinc-950/80 rounded-2xl border border-zinc-850 p-6 relative">
          <span className="text-zinc-600 font-mono text-[10px] uppercase tracking-wider absolute top-4">
            {ARTICLES[selectedArticleIdx].title} • {wpm} WPM
          </span>

          {/* Focal Aid Indicators */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-10 border-t border-b border-zinc-800/40 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 border-l border-r border-rose-500/20 pointer-events-none" />

          <div className="text-3xl md:text-4xl font-sans font-black text-center text-white select-none pointer-events-none tracking-tight">
            {words[currentWordIdx]}
          </div>

          <div className="w-full max-w-xs bg-zinc-900 h-1 rounded-full absolute bottom-4 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-75"
              style={{ width: `${((currentWordIdx + 1) / words.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Questions state */}
      {gameState === "questions" && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="text-sm font-semibold uppercase font-mono tracking-wider text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-2">
            Comprehension Metrics Validation
          </h3>

          <div className="space-y-5 max-h-[350px] overflow-y-auto pr-1">
            {ARTICLES[selectedArticleIdx].questions.map((q, qIdx) => (
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
                          ? "bg-indigo-600/20 border-indigo-500 text-white font-bold"
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
            disabled={Object.keys(userAnswers).length < ARTICLES[selectedArticleIdx].questions.length}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-sans font-semibold rounded-2xl shadow-lg cursor-pointer"
            id="btn-submit-rsvp-questions"
          >
            Submit Comprehension Analysis
          </button>
        </div>
      )}

      {/* Results panel */}
      {gameState === "results" && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-4">
            <div className="text-center">
              <span className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Analysis Complete</span>
              <div className={`text-5xl font-mono font-black mt-1 ${
                accuracy >= 100 ? "text-emerald-400" : accuracy >= 66 ? "text-indigo-400" : "text-amber-500"
              }`}>
                {accuracy.toFixed(0)}% <span className="text-lg">Accuracy</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono border-t border-b border-zinc-900 py-4 text-center text-zinc-400">
              <div>Serial Speed: <span className="text-white font-bold">{wpm} WPM</span></div>
              <div>Topic Domain: <span className="text-white font-bold">{ARTICLES[selectedArticleIdx].category}</span></div>
              <div>Effective Reading: <span className="text-white font-bold">{Math.round((accuracy / 100) * wpm)} WPM</span></div>
            </div>

            <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-900">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Full Article Context:</span>
              <p className="text-xs text-zinc-300 leading-relaxed italic">
                "{ARTICLES[selectedArticleIdx].text}"
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
