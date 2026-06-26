/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  CheckCircle, 
  Circle, 
  Play, 
  Pause,
  SkipForward,
  X,
  Award,
  Flame, 
  Brain, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Trophy,
  Zap,
  BookOpen,
  Eye,
  Activity
} from "lucide-react";
import { ExerciseId, UserStats, AppSettings, ExerciseSession } from "../types";

// Import custom cognitive components
import FlashLetter from "./FlashLetter";
import FlashNumber from "./FlashNumber";
import FlashSentence from "./FlashSentence";
import FlashParagraph from "./FlashParagraph";
import PeripheralVision from "./PeripheralVision";
import ChunkReading from "./ChunkReading";
import RSVPPreading from "./RSVPPreading";
import WordGroupTrainer from "./WordGroupTrainer";
import VisualPattern from "./VisualPattern";
import DualNBack from "./DualNBack";

interface DailyMinimumProps {
  settings: AppSettings;
  userStats: UserStats;
  onStartExercise: (exerciseId: ExerciseId) => void;
  onLogSession: (session: ExerciseSession) => void;
}

interface DailyExerciseDef {
  id: ExerciseId;
  name: string;
  category: "Memory" | "Attention" | "Speed Reading" | "Vision";
  target: string;
  estTime: number; // in minutes
  description: string;
}

// Full 10 exercises list categorized into 4 unique, non-overlapping skill pools
const SKILL_POOLS: DailyExerciseDef[][] = [
  // Pool 0: Visual / Spatial Memory
  [
    {
      id: ExerciseId.FLASH_LETTER,
      name: "Flash Letter Memory",
      category: "Memory",
      target: "Complete 3 rounds",
      estTime: 3,
      description: "Retain random absolute letter layouts instantly. Shapes spatial working memory."
    },
    {
      id: ExerciseId.VISUAL_PATTERN,
      name: "Visual Pattern Memory",
      category: "Memory",
      target: "Complete 3 rounds",
      estTime: 3,
      description: "Recreate flashing matrix light configurations. Sharpens parietal lobe layouts."
    }
  ],
  // Pool 1: Executive Attention & Working Memory
  [
    {
      id: ExerciseId.DUAL_N_BACK,
      name: "Dual N-Back",
      category: "Attention",
      target: "Complete 1 full block",
      estTime: 3,
      description: "Match visual positions and auditory chimes continuously. Proved to expand fluid IQ."
    },
    {
      id: ExerciseId.FLASH_NUMBER,
      name: "Flash Number Search",
      category: "Memory",
      target: "Complete 3 rounds",
      estTime: 2,
      description: "Scan and recall numerical matrix positions. Strengthens high speed memory retrieval."
    }
  ],
  // Pool 2: Speed Reading - Streaming / Chunking
  [
    {
      id: ExerciseId.RSVP_SPEED_READING,
      name: "RSVP Speed Reading",
      category: "Speed Reading",
      target: "Complete 3 rounds",
      estTime: 2,
      description: "Single-word high rate serial streaming. Overcomes sub-vocalization loops."
    },
    {
      id: ExerciseId.CHUNK_READING,
      name: "Eye-Hop Chunk Reading",
      category: "Speed Reading",
      target: "Read 2 articles",
      estTime: 3,
      description: "Capture larger multi-word blocks of text at once. Expands vertical focus jump spans."
    },
    {
      id: ExerciseId.FLASH_PARAGRAPH,
      name: "Flash Paragraph Speed",
      category: "Speed Reading",
      target: "Read 2 passages",
      estTime: 3,
      description: "Absorb large horizontal blocks of text instantly. Maximizes visual processing buffers."
    }
  ],
  // Pool 3: Vision & Observation Expansion
  [
    {
      id: ExerciseId.PERIPHERAL_VISION,
      name: "Schulte Table Expand",
      category: "Vision",
      target: "Complete 5 rounds",
      estTime: 3,
      description: "Find sequential numbers without moving focal center. Trains outer rod-cell focus."
    },
    {
      id: ExerciseId.WORD_GROUP,
      name: "Word Group Flash",
      category: "Vision",
      target: "Complete 5 flashes",
      estTime: 2,
      description: "Capture horizontal unrelated words simultaneously. Strengthens optical fixation."
    },
    {
      id: ExerciseId.FLASH_SENTENCE,
      name: "Flash Sentence Speed",
      category: "Speed Reading",
      target: "Read 5 sentences",
      estTime: 2,
      description: "Strengthen quick phrase capture speeds. Extends visual retention span."
    }
  ]
];

// List of motivating baseline quotes
const MOTIVATING_QUOTES = [
  "Consistency is the compounding interest of your cognitive reserve.",
  "Your brain adapts to whatever you challenge it with. Keep loading the pathways.",
  "Just 10 minutes of targeted focus keeps neuroplastic pathways primed.",
  "Baseline sessions prevent synaptic pruning. Every streak matters.",
  "Small daily inputs yield monumental long-term intellectual capacity."
];

export default function DailyMinimum({ settings, userStats, onStartExercise, onLogSession }: DailyMinimumProps) {
  // Get date helper (YYYY-MM-DD)
  const getLocalDateString = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());

  // Deterministic daily selection based on days elapsed
  const dailyRoutine = useMemo(() => {
    const dayIndex = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
    
    // Select 6 unique exercises daily covering Memory, Attention, Speed Reading, and Vision
    const m1 = SKILL_POOLS[0][dayIndex % SKILL_POOLS[0].length];
    const a1 = SKILL_POOLS[1][(dayIndex + 1) % SKILL_POOLS[1].length];
    const s1 = SKILL_POOLS[2][dayIndex % SKILL_POOLS[2].length];
    const v1 = SKILL_POOLS[3][(dayIndex + 2) % SKILL_POOLS[3].length];
    
    const m2 = SKILL_POOLS[0][(dayIndex + 1) % SKILL_POOLS[0].length];
    const s2 = SKILL_POOLS[2][(dayIndex + 1) % SKILL_POOLS[2].length];

    const candidates = [m1, a1, s1, v1, m2, s2];
    const uniqueList: DailyExerciseDef[] = [];
    const seenIds = new Set<string>();

    for (const item of candidates) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueList.push(item);
      }
    }

    // Backfill if we ever have less than 6
    if (uniqueList.length < 6) {
      const allDefs = [...SKILL_POOLS[0], ...SKILL_POOLS[1], ...SKILL_POOLS[2], ...SKILL_POOLS[3]];
      for (const item of allDefs) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueList.push(item);
          if (uniqueList.length === 6) break;
        }
      }
    }

    return uniqueList.slice(0, 6).map(ex => ({
      ...ex,
      target: "2 Minutes",
      estTime: 2
    }));
  }, [todayStr]);

  // Determine completed exercises today
  const completedToday = useMemo(() => {
    const todaySessions = userStats.sessions.filter(
      (session) => getLocalDateString(session.date) === todayStr
    );
    
    // Build a unique set of exercise IDs completed today
    return new Set(todaySessions.map((s) => s.exerciseId));
  }, [userStats.sessions, todayStr]);

  // Calculate stats
  const totalExercises = dailyRoutine.length;
  const completedCount = dailyRoutine.filter((ex) => completedToday.has(ex.id)).length;
  const progressPercent = Math.round((completedCount / totalExercises) * 100);
  const isComplete = completedCount === totalExercises;

  // Total estimated time for remaining exercises
  const totalEstTime = dailyRoutine.reduce((sum, ex) => sum + ex.estTime, 0);
  const remainingTime = dailyRoutine
    .filter((ex) => !completedToday.has(ex.id))
    .reduce((sum, ex) => sum + ex.estTime, 0);

  // Pick deterministic quote based on day of month
  const dailyQuote = useMemo(() => {
    const dayOfMonth = new Date().getDate();
    return MOTIVATING_QUOTES[dayOfMonth % MOTIVATING_QUOTES.length];
  }, [todayStr]);

  // Guided Workout State
  const [isWorkoutActive, setIsWorkoutActive] = useState<boolean>(false);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState<number>(0);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(120); // 120s
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [phase, setPhase] = useState<"intro" | "exercise" | "transition" | "completed">("intro");
  const [transitionCountdown, setTransitionCountdown] = useState<number>(4);
  const [completedSessions, setCompletedSessions] = useState<ExerciseSession[]>([]);

  // Timer effect for the active exercise
  useEffect(() => {
    if (!isWorkoutActive || phase !== "exercise" || isPaused) return;

    const timer = setInterval(() => {
      setTimeRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleExerciseComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isWorkoutActive, phase, isPaused, currentExerciseIdx]);

  // Timer effect for intro or exercise transitions
  useEffect(() => {
    if (!isWorkoutActive || (phase !== "transition" && phase !== "intro")) return;

    const timer = setInterval(() => {
      setTransitionCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (phase === "transition") {
            setCurrentExerciseIdx((idx) => idx + 1);
          }
          setPhase("exercise");
          setTimeRemainingSec(120);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isWorkoutActive, phase]);

  const handleExerciseComplete = () => {
    if (currentExerciseIdx < dailyRoutine.length - 1) {
      setPhase("transition");
      setTransitionCountdown(4);
    } else {
      setPhase("completed");
    }
  };

  const handleSkipExercise = () => {
    if (currentExerciseIdx < dailyRoutine.length - 1) {
      setPhase("transition");
      setTransitionCountdown(4);
    } else {
      setPhase("completed");
    }
  };

  const startGuidedWorkout = () => {
    setIsWorkoutActive(true);
    setCurrentExerciseIdx(0);
    setTimeRemainingSec(120);
    setIsPaused(false);
    setPhase("intro");
    setTransitionCountdown(4);
    setCompletedSessions([]);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Memory":
        return <Brain className="w-4 h-4 text-pink-400" />;
      case "Attention":
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case "Speed Reading":
        return <BookOpen className="w-4 h-4 text-cyan-400" />;
      case "Vision":
        return <Eye className="w-4 h-4 text-purple-400" />;
      default:
        return <Zap className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getCategoryTheme = (category: string, theme: "light" | "dark") => {
    const isLight = theme === "light";
    switch (category) {
      case "Memory":
        return isLight 
          ? "bg-pink-100 text-pink-700 border-pink-200" 
          : "bg-pink-500/10 text-pink-400 border-pink-500/20";
      case "Attention":
        return isLight 
          ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Speed Reading":
        return isLight 
          ? "bg-cyan-100 text-cyan-700 border-cyan-200" 
          : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "Vision":
        return isLight 
          ? "bg-purple-100 text-purple-700 border-purple-200" 
          : "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return isLight 
          ? "bg-indigo-100 text-indigo-700 border-indigo-200" 
          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    }
  };

  const renderCurrentExercise = () => {
    const activeExercise = dailyRoutine[currentExerciseIdx];
    const commonProps = {
      soundEnabled: settings.timerSounds,
      autoScale: settings.difficultyAutoScaling,
      isGuided: true,
      onSessionComplete: (session: ExerciseSession) => {
        setCompletedSessions((prev) => [...prev, session]);
        onLogSession(session);
      }
    };

    switch (activeExercise.id) {
      case ExerciseId.FLASH_LETTER:
        return <FlashLetter {...commonProps} />;
      case ExerciseId.FLASH_NUMBER:
        return <FlashNumber {...commonProps} />;
      case ExerciseId.FLASH_SENTENCE:
        return <FlashSentence {...commonProps} />;
      case ExerciseId.FLASH_PARAGRAPH:
        return <FlashParagraph {...commonProps} />;
      case ExerciseId.PERIPHERAL_VISION:
        return <PeripheralVision {...commonProps} />;
      case ExerciseId.CHUNK_READING:
        return <ChunkReading {...commonProps} />;
      case ExerciseId.RSVP_SPEED_READING:
        return <RSVPPreading {...commonProps} />;
      case ExerciseId.WORD_GROUP:
        return <WordGroupTrainer {...commonProps} />;
      case ExerciseId.VISUAL_PATTERN:
        return <VisualPattern {...commonProps} />;
      case ExerciseId.DUAL_N_BACK:
        return <DualNBack soundEnabled={settings.timerSounds} isGuided={true} onSessionComplete={commonProps.onSessionComplete} />;
      default:
        return null;
    }
  };

  if (isWorkoutActive) {
    const activeExercise = dailyRoutine[currentExerciseIdx];
    
    // Overall Progress calculation:
    // Total seconds = dailyRoutine.length * 120 (720s for 6 exercises)
    // Elapsed seconds = currentExerciseIdx * 120 + (120 - timeRemainingSec)
    const totalSec = dailyRoutine.length * 120;
    const elapsedSec = (currentExerciseIdx * 120) + (120 - timeRemainingSec);
    const overallProgressPercent = Math.min(100, Math.round((elapsedSec / totalSec) * 100));

    // Accuracy & Score calculation for completion screen
    const avgAccuracy = completedSessions.length > 0
      ? Math.round(completedSessions.reduce((sum, s) => sum + s.accuracy, 0) / completedSessions.length)
      : 100;
    const totalScore = completedSessions.reduce((sum, s) => sum + s.score, 0);

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto flex flex-col bg-[#050507] text-white font-sans select-none" id="guided-workout-fullscreen">
        {/* Confetti effect background if completed */}
        {phase === "completed" && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />
        )}

        {/* 1. INTRO / TRANSITION PHASE */}
        {(phase === "intro" || phase === "transition") && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-8 animate-fade-in my-auto">
            <div className="space-y-3">
              <span className="text-[10px] tracking-[0.2em] font-mono uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-1.5 rounded-full">
                {phase === "intro" ? "⚡ Guided Workout Starting" : "✅ Exercise Complete"}
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
                {phase === "intro" ? "Prepare Your Focus" : "Awesome Progress!"}
              </h2>
            </div>

            {/* Next Exercise Card */}
            <div className="w-full bg-zinc-900/40 border border-zinc-800/60 p-6 rounded-3xl space-y-4 backdrop-blur-sm shadow-xl">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                Next up • Exercise {currentExerciseIdx + (phase === "transition" ? 2 : 1)} of {dailyRoutine.length}
              </span>
              <div className="flex items-center justify-center gap-2.5">
                <span className="p-2.5 bg-zinc-900 rounded-2xl border border-zinc-800">
                  {getCategoryIcon(dailyRoutine[currentExerciseIdx + (phase === "transition" ? 1 : 0)]?.category)}
                </span>
                <h3 className="text-xl font-serif font-semibold">
                  {dailyRoutine[currentExerciseIdx + (phase === "transition" ? 1 : 0)]?.name}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                {dailyRoutine[currentExerciseIdx + (phase === "transition" ? 1 : 0)]?.description}
              </p>
              <div className="pt-2 flex justify-center gap-6 text-[10px] font-mono uppercase text-zinc-500">
                <span>⏱️ Duration: 2 Minutes</span>
                <span>🎯 Target: Maximum Accuracy</span>
              </div>
            </div>

            {/* Countdown animation */}
            <div className="relative flex items-center justify-center w-24 h-24">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="44" strokeWidth="3" stroke="rgba(255,255,255,0.05)" fill="transparent" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="44" 
                  strokeWidth="3.5" 
                  stroke="#6366f1" 
                  fill="transparent" 
                  strokeDasharray={276}
                  strokeDashoffset={276 - (276 * transitionCountdown) / 4}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="text-4xl font-serif font-bold text-white animate-pulse">
                {transitionCountdown}
              </span>
            </div>

            <div className="text-xs text-zinc-500 font-mono tracking-wider animate-pulse">
              Starting automatically. Get ready...
            </div>
          </div>
        )}

        {/* 2. EXERCISE PLAYING PHASE */}
        {phase === "exercise" && (
          <div className="flex-1 flex flex-col h-full relative">
            {/* High-tech Guided Header */}
            <div className="bg-zinc-950/80 border-b border-zinc-900/60 backdrop-blur-md px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-40 shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                  {getCategoryIcon(activeExercise.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      Exercise {currentExerciseIdx + 1} of {dailyRoutine.length}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold uppercase">
                      {activeExercise.category}
                    </span>
                  </div>
                  <h2 className="text-sm font-sans font-bold text-white tracking-tight mt-0.5">
                    {activeExercise.name}
                  </h2>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center justify-center">
                <div className={`px-5 py-2 rounded-2xl border flex items-center gap-2.5 shadow-inner transition-all duration-300 ${
                  timeRemainingSec < 15
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse scale-105"
                    : "bg-zinc-900/50 border-zinc-800 text-indigo-400"
                }`}>
                  <Clock className={`w-4 h-4 ${timeRemainingSec < 15 ? "text-rose-400" : "text-indigo-400"}`} />
                  <span className="text-xl font-mono font-bold tracking-wider">
                    {formatTimer(timeRemainingSec)}
                  </span>
                </div>
              </div>

              {/* Playlist Controls */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setIsPaused((p) => !p)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 fill-current text-indigo-400" /> : <Pause className="w-3.5 h-3.5 fill-current text-indigo-400" />}
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={handleSkipExercise}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <SkipForward className="w-3.5 h-3.5 fill-current text-indigo-400" />
                  Skip
                </button>
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to exit this guided workout? Completed exercises will be saved, but the full routine progress will be lost.")) {
                      setIsWorkoutActive(false);
                    }
                  }}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Exit
                </button>
              </div>
            </div>

            {/* Dividor smooth overall progress bar */}
            <div className="w-full h-1 bg-zinc-900 overflow-hidden shrink-0">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-1000"
                style={{ width: `${overallProgressPercent}%` }}
              />
            </div>

            {/* Exercise Component Container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center relative">
              <div className="w-full max-w-4xl">
                {renderCurrentExercise()}
              </div>

              {/* Pause Frosted Overlay */}
              {isPaused && (
                <div className="absolute inset-0 z-50 backdrop-blur-md bg-black/60 flex flex-col items-center justify-center space-y-4 text-center p-6 animate-fade-in">
                  <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800 shadow-xl">
                    <Pause className="w-8 h-8 text-indigo-400 fill-indigo-400 animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-serif font-semibold text-white">Workout Paused</h3>
                  <p className="text-zinc-400 text-xs max-w-xs leading-relaxed">
                    Take a deep breath. Stand tall, rest your eyes, and resume when you are ready to focus.
                  </p>
                  <button
                    onClick={() => setIsPaused(false)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-xs"
                  >
                    ▶️ Resume Session
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. WORKOUT COMPLETED SUMMARY PHASE */}
        {phase === "completed" && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto space-y-8 animate-fade-in my-auto relative z-10">
            {/* Golden Trophy Halo */}
            <div className="space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-pulse" />
                <div className="p-5 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-3xl shadow-xl relative z-10">
                  <Trophy className="w-12 h-12 text-zinc-950 animate-bounce" />
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] tracking-[0.25em] font-mono uppercase text-indigo-400 font-bold block">
                  NEURAL COMPILING SECURED
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
                  🎉 Daily Minimum Completed!
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
                  Outstanding job! You ran through the entire cognitive playlist. Your synaptic structures have been primed for high-efficiency processing.
                </p>
              </div>
            </div>

            {/* Workout Performance Grid */}
            <div className="w-full grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/40 border border-zinc-800/40 p-5 rounded-2xl flex flex-col items-center justify-center space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Time Trained</span>
                <span className="text-lg font-mono font-bold text-white">12m 0s</span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/40 p-5 rounded-2xl flex flex-col items-center justify-center space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Completed</span>
                <span className="text-lg font-mono font-bold text-white">6 / 6 Exercises</span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/40 p-5 rounded-2xl flex flex-col items-center justify-center space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Avg. Accuracy</span>
                <span className="text-lg font-mono font-bold text-emerald-400">{avgAccuracy}%</span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/40 p-5 rounded-2xl flex flex-col items-center justify-center space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">XP Accumulated</span>
                <span className="text-lg font-mono font-bold text-indigo-400">+{totalScore} XP</span>
              </div>
            </div>

            {/* Streak card */}
            <div className="w-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 p-5 rounded-3xl flex items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <Flame className="w-6 h-6 text-orange-500 animate-pulse fill-orange-500" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm text-white">
                    {userStats.streak} Day Training Streak!
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">
                    Synaptic pruning avoided. Keep training tomorrow to extend your compound benefits.
                  </p>
                </div>
              </div>
              <div className="text-xs font-mono text-orange-400 font-extrabold shrink-0">
                ACTIVE 🔥
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => setIsWorkoutActive(false)}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-sans font-bold rounded-2xl shadow-xl shadow-indigo-600/10 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer text-sm"
            >
              Claim Rewards & Return to Studio
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in" id="daily-minimum-wrapper">
      
      {/* Overview Hero Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden transition-all ${
        settings.theme === "light"
          ? "bg-gradient-to-br from-[#F5F2EA] to-[#EBE8DF] border-black/5 text-[#1C1C1C]"
          : "bg-gradient-to-br from-[#0F0F12] to-[#08080A] border-white/5 text-[#F0F0F0]"
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] uppercase tracking-widest font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                settings.theme === "light" ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              }`}>
                Recommended Essential
              </span>
              <span className={`text-[10px] uppercase tracking-widest font-mono text-zinc-500 ${settings.theme === "light" ? "text-zinc-600" : "text-white/40"}`}>
                • {totalEstTime} Min Baseline
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-tight">
              The Daily Minimum
            </h2>
            <p className={`text-xs max-w-xl mt-2 leading-relaxed ${settings.theme === "light" ? "text-zinc-600" : "text-white/60"}`}>
              No time? No problem. Run through today's curated playlist of 6 essential exercises to train all major cognitive centers—Memory, Attention, Speed Reading, and Vision. Starts instantly and transitions automatically.
            </p>
            <button
              onClick={startGuidedWorkout}
              className="mt-4 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse" />
              Start Guided Workout Playlist (12 min)
            </button>
          </div>

          {/* Large Progress Indicator */}
          <div className="flex items-center gap-4 bg-black/15 p-4 rounded-2xl border border-white/5 shrink-0 self-start md:self-auto">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  strokeWidth="4"
                  stroke={settings.theme === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"}
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  strokeWidth="4"
                  stroke="#6366f1"
                  fill="transparent"
                  strokeDasharray={176}
                  strokeDashoffset={176 - (176 * progressPercent) / 100}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="text-sm font-mono font-semibold text-indigo-400">
                {progressPercent}%
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">Today's Progress</span>
              <span className="text-lg font-mono font-bold">
                {completedCount} <span className="text-zinc-500">/ {totalExercises}</span>
              </span>
              <span className="text-xs text-zinc-400 block font-mono mt-0.5">
                {isComplete ? "Goal Reached!" : `${remainingTime}m remaining`}
              </span>
            </div>
          </div>
        </div>

        {/* Celebrating message */}
        {isComplete ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 p-4 rounded-2xl border flex items-center gap-3.5 bg-emerald-500/10 border-emerald-500/20 text-emerald-400`}
          >
            <Trophy className="w-5 h-5 text-yellow-400 shrink-0 animate-bounce" />
            <div>
              <p className="text-xs font-bold font-sans">🎉 Baseline fully secured for today!</p>
              <p className="text-[11px] opacity-85 mt-0.5 font-sans">Compounding cognitive gains locked in. You've trained every essential mental category. Extra practice is welcome!</p>
            </div>
          </motion.div>
        ) : (
          <div className={`mt-6 pt-4 border-t flex items-center gap-2 text-xs font-serif italic ${
            settings.theme === "light" ? "border-black/5 text-zinc-500" : "border-white/5 text-white/40"
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>"{dailyQuote}"</span>
          </div>
        )}
      </div>

      {/* Grid of Exercises */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dailyRoutine.map((exercise, idx) => {
          const isDone = completedToday.has(exercise.id);
          
          return (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-5 rounded-2xl border flex flex-col justify-between h-56 transition-all group relative ${
                isDone
                  ? settings.theme === "light"
                    ? "bg-[#EAF5EC] border-emerald-500/20 shadow-sm"
                    : "bg-[#0A120D] border-emerald-500/20 shadow-sm"
                  : settings.theme === "light"
                    ? "bg-[#F2F0EA] border-black/5 hover:border-indigo-600/30 hover:shadow-md"
                    : "bg-[#0C0C0F] border-white/5 hover:border-indigo-500/30 hover:shadow-md"
              }`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${getCategoryTheme(exercise.category, settings.theme)}`}>
                    {getCategoryIcon(exercise.category)}
                    {exercise.category}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {exercise.estTime} min
                    </span>
                    {isDone ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className={`w-5 h-5 ${settings.theme === "light" ? "text-black/10" : "text-white/10"}`} />
                    )}
                  </div>
                </div>

                <h3 className={`font-serif text-lg font-semibold tracking-tight mt-4 group-hover:text-indigo-400 transition-colors ${
                  settings.theme === "light" ? "text-zinc-800" : "text-white"
                }`}>
                  {exercise.name}
                </h3>
                <p className={`text-xs leading-relaxed mt-1.5 line-clamp-2 ${
                  settings.theme === "light" ? "text-zinc-600" : "text-white/50"
                }`}>
                  {exercise.description}
                </p>
              </div>

              <div className={`flex justify-between items-center mt-4 pt-3 border-t ${
                settings.theme === "light" ? "border-black/5" : "border-white/5"
              }`}>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  Target: {exercise.target}
                </span>

                <button
                  onClick={() => onStartExercise(exercise.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    isDone
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/10 hover:scale-[1.02]"
                  }`}
                >
                  {isDone ? "Practice Again" : "Begin Session"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
