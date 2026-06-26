/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Zap, 
  Flame, 
  Settings, 
  Award, 
  Activity, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  TrendingUp, 
  CheckCircle, 
  X,
  Sparkles,
  RefreshCw,
  Eye,
  Brain,
  BookOpen,
  ArrowRight
} from "lucide-react";

import { ExerciseId, ExerciseSession, UserStats, AppSettings, Achievement, DailyChallenge } from "./types";
import { playLevelUpSound, playSuccessSound, playFailureSound } from "./lib/sounds";

// Import custom cognitive components
import Dashboard from "./components/Dashboard";
import FlashLetter from "./components/FlashLetter";
import FlashNumber from "./components/FlashNumber";
import FlashSentence from "./components/FlashSentence";
import FlashParagraph from "./components/FlashParagraph";
import PeripheralVision from "./components/PeripheralVision";
import ChunkReading from "./components/ChunkReading";
import RSVPPreading from "./components/RSVPPreading";
import WordGroupTrainer from "./components/WordGroupTrainer";
import VisualPattern from "./components/VisualPattern";
import DualNBack from "./components/DualNBack";
import DailyMinimum from "./components/DailyMinimum";

const ACHIEVEMENTS_POOL: Achievement[] = [
  {
    id: "first-session",
    title: "Cognitive Pioneer",
    description: "Successfully complete your first neural fitness session.",
    icon: "🚀",
    category: "General",
    maxProgress: 1,
    xpReward: 100
  },
  {
    id: "streak-3",
    title: "Habitual Learner",
    description: "Maintain a 3-day active training streak.",
    icon: "🔥",
    category: "Streak",
    maxProgress: 3,
    xpReward: 500
  },
  {
    id: "level-5",
    title: "Synaptic Explorer",
    description: "Reach brain-training Level 5.",
    icon: "⚡",
    category: "XP",
    maxProgress: 5,
    xpReward: 1000
  },
  {
    id: "rsvp-speed",
    title: "Photographic Reader",
    description: "Train RSVP Speed Reading at or above 500 WPM.",
    icon: "⚡",
    category: "Speed Reading",
    maxProgress: 500,
    xpReward: 400
  },
  {
    id: "pattern-perfect",
    title: "Spatial Architect",
    description: "Complete Visual Pattern Memory with 100% accuracy.",
    icon: "🧊",
    category: "Memory",
    maxProgress: 100,
    xpReward: 300
  },
  {
    id: "dual-nback-master",
    title: "Executive Director",
    description: "Engage in Dual N-Back at N=2 or above with high hits.",
    icon: "🧠",
    category: "Attention",
    maxProgress: 2,
    xpReward: 600
  }
];

const INITIAL_STATS: UserStats = {
  sessions: [],
  xp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: null,
  bestScores: {
    [ExerciseId.FLASH_LETTER]: 0,
    [ExerciseId.FLASH_NUMBER]: 0,
    [ExerciseId.FLASH_SENTENCE]: 0,
    [ExerciseId.FLASH_PARAGRAPH]: 0,
    [ExerciseId.PERIPHERAL_VISION]: 0,
    [ExerciseId.CHUNK_READING]: 0,
    [ExerciseId.RSVP_SPEED_READING]: 0,
    [ExerciseId.WORD_GROUP]: 0,
    [ExerciseId.VISUAL_PATTERN]: 0,
    [ExerciseId.DUAL_N_BACK]: 0
  },
  unlockedAchievements: [],
  dailyChallengeDate: null,
  dailyChallengeCompleted: false
};

const DEFAULT_SETTINGS: AppSettings = {
  difficultyAutoScaling: true,
  timerSounds: true,
  theme: "dark",
  fullscreen: false,
  keyboardShortcuts: true,
  practiceReminder: true,
  reminderTime: "08:30"
};

export default function App() {
  // Navigation & Views
  const [activeView, setActiveView] = useState<"home" | "daily-minimum" | "dashboard" | "settings" | "achievements" | ExerciseId>("home");
  const [comingFromDailyMin, setComingFromDailyMin] = useState<boolean>(false);
  
  // Storage states
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_STATS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Visual states
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load persistence data
  useEffect(() => {
    try {
      const storedStats = localStorage.getItem("neurotrain_user_stats_v1");
      const storedSettings = localStorage.getItem("neurotrain_settings_v1");

      if (storedStats) {
        const parsed = JSON.parse(storedStats);
        // Guarantee all exercise ids exist in loaded bestScores
        const bestScores = { ...INITIAL_STATS.bestScores, ...parsed.bestScores };
        setUserStats({ ...parsed, bestScores });
      } else {
        // Trigger default setup
        localStorage.setItem("neurotrain_user_stats_v1", JSON.stringify(INITIAL_STATS));
      }

      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (e) {
      console.warn("Could not read local storage configurations:", e);
    }
  }, []);

  // Save stats state whenever modified
  const saveStats = (newStats: UserStats) => {
    setUserStats(newStats);
    try {
      localStorage.setItem("neurotrain_user_stats_v1", JSON.stringify(newStats));
    } catch (e) {
      console.error("Failed to write user stats to local storage:", e);
    }
  };

  // Save settings state whenever modified
  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem("neurotrain_settings_v1", JSON.stringify(newSettings));
    } catch (e) {
      console.error("Failed to write settings to local storage:", e);
    }
  };

  // Handle Fullscreen Toggle
  const toggleFullscreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Setup Streak Logic upon active calendar days
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    if (userStats.lastActiveDate === todayStr) return;

    let newStreak = userStats.streak;
    
    if (userStats.lastActiveDate) {
      const lastActive = new Date(userStats.lastActiveDate);
      const today = new Date(todayStr);
      const diffTime = Math.abs(today.getTime() - lastActive.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1; // Reset to 1 since they broke the streak
      }
    } else {
      newStreak = 1; // First day
    }

    saveStats({
      ...userStats,
      streak: newStreak,
      lastActiveDate: todayStr,
      // Reset daily challenge state if day changed
      dailyChallengeCompleted: userStats.dailyChallengeDate === todayStr ? userStats.dailyChallengeCompleted : false,
      dailyChallengeDate: todayStr
    });
  }, [userStats.lastActiveDate]);

  // Toast notifier
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Trigger Exercise Session Complete Statistics Processing
  const handleSessionComplete = (session: ExerciseSession) => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Add session, calculate new XP, Best Scores, and Level Ups
    const updatedSessions = [...userStats.sessions, session];
    const earnedXp = session.score;
    const previousXp = userStats.xp;
    const totalXp = previousXp + earnedXp;

    // Standard Level Up: 1000 XP per Level
    const previousLevel = userStats.level;
    const currentLevel = Math.floor(totalXp / 1000) + 1;

    // Best Score tracking per exercise
    const previousBest = userStats.bestScores[session.exerciseId] || 0;
    const currentBest = Math.max(previousBest, session.score);
    const updatedBestScores = {
      ...userStats.bestScores,
      [session.exerciseId]: currentBest
    };

    // Check Daily Challenge progress (e.g. Daily challenge: Complete ANY session with > 80% accuracy)
    let dailyChallengeCompleted = userStats.dailyChallengeCompleted;
    if (!dailyChallengeCompleted && session.accuracy >= 80) {
      dailyChallengeCompleted = true;
      showToast("🏆 Daily Challenge Completed! +250 XP bonus!");
    }

    // Prepare updated stats structure
    let updatedStats: UserStats = {
      ...userStats,
      sessions: updatedSessions,
      xp: totalXp + (dailyChallengeCompleted && !userStats.dailyChallengeCompleted ? 250 : 0),
      level: currentLevel,
      bestScores: updatedBestScores,
      dailyChallengeCompleted
    };

    // Process Achievement checks
    const newlyUnlocked: string[] = [];
    ACHIEVEMENTS_POOL.forEach(ach => {
      if (userStats.unlockedAchievements.includes(ach.id)) return;

      let meetsCriteria = false;
      if (ach.id === "first-session" && updatedSessions.length >= 1) meetsCriteria = true;
      if (ach.id === "streak-3" && userStats.streak >= 3) meetsCriteria = true;
      if (ach.id === "level-5" && currentLevel >= 5) meetsCriteria = true;
      if (ach.id === "rsvp-speed" && session.exerciseId === ExerciseId.RSVP_SPEED_READING && session.difficulty >= 500 && session.accuracy >= 80) meetsCriteria = true;
      if (ach.id === "pattern-perfect" && session.exerciseId === ExerciseId.VISUAL_PATTERN && session.accuracy === 100) meetsCriteria = true;
      if (ach.id === "dual-nback-master" && session.exerciseId === ExerciseId.DUAL_N_BACK && session.difficulty >= 2 && session.accuracy >= 70) meetsCriteria = true;

      if (meetsCriteria) {
        newlyUnlocked.push(ach.id);
      }
    });

    if (newlyUnlocked.length > 0) {
      updatedStats.unlockedAchievements = [...userStats.unlockedAchievements, ...newlyUnlocked];
      // Grant XP rewards
      let rewardsSum = 0;
      newlyUnlocked.forEach(id => {
        const ach = ACHIEVEMENTS_POOL.find(a => a.id === id);
        if (ach) {
          rewardsSum += ach.xpReward;
          showToast(`🎖️ Achievement Unlocked: ${ach.title}! +${ach.xpReward} XP!`);
        }
      });
      updatedStats.xp += rewardsSum;
    }

    if (currentLevel > previousLevel) {
      if (settings.timerSounds) playLevelUpSound();
      showToast(`⚡ LEVEL UP! Welcome to level ${currentLevel}!`);
    }

    saveStats(updatedStats);
  };

  // Reset progress option
  const handleResetProgress = () => {
    if (confirm("Are you absolutely sure you want to reset all training stats, achievements, and session history? This cannot be undone.")) {
      saveStats(INITIAL_STATS);
      showToast("🔄 All cognitive progress has been reset.");
      setActiveView("home");
    }
  };

  // Render Exercise UI corresponding to ID
  const renderActiveExercise = () => {
    const commonProps = {
      soundEnabled: settings.timerSounds,
      autoScale: settings.difficultyAutoScaling,
      onSessionComplete: handleSessionComplete
    };

    switch (activeView) {
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
        return <DualNBack soundEnabled={settings.timerSounds} onSessionComplete={handleSessionComplete} />;
      default:
        return null;
    }
  };

  // XP level threshold helper
  const nextLevelXpThreshold = userStats.level * 1000;
  const currentLevelXpProgress = userStats.xp % 1000;
  const xpProgressBarPercentage = (currentLevelXpProgress / 1000) * 100;

  return (
    <div className={`min-h-screen font-sans flex flex-col md:flex-row transition-colors duration-300 select-none ${
      settings.theme === "light" ? "bg-[#FAF9F6] text-[#1C1C1C]" : "bg-[#050505] text-[#F0F0F0]"
    }`}>
      {/* Toast Notifier */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 font-sans text-sm rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-in border ${
          settings.theme === "light" 
            ? "bg-[#FAF9F6] border-emerald-600/30 text-emerald-800" 
            : "bg-[#0F0F0F] border-emerald-500/30 text-emerald-300"
        }`}>
          <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`w-full md:w-20 md:min-h-screen md:border-r border-b md:border-b-0 flex md:flex-col flex-row items-center py-4 md:py-8 justify-between px-6 md:px-0 transition-colors shrink-0 z-40 ${
        settings.theme === "light" 
          ? "bg-[#F2F0EA] border-black/10 text-black/60" 
          : "bg-[#080808] border-white/10 text-white/40"
      }`}>
        <div className="flex md:flex-col items-center gap-6 md:gap-8 w-full md:w-auto justify-between md:justify-start">
          <div 
            onClick={() => setActiveView("home")}
            className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-500/20 text-white cursor-pointer select-none hover:bg-indigo-500 transition-colors"
          >
            Σ
          </div>
          <nav className="flex md:flex-col gap-6 md:gap-8 items-center">
            <button
              onClick={() => setActiveView("home")}
              className={`transition-colors cursor-pointer p-1.5 rounded-lg ${
                activeView === "home" 
                  ? "text-indigo-400 bg-indigo-500/5" 
                  : settings.theme === "light" ? "text-zinc-500 hover:text-zinc-800 hover:bg-black/5" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
              title="Home Modules"
            >
              <Brain className="w-5.5 h-5.5" />
            </button>
            <button
              onClick={() => setActiveView("daily-minimum")}
              className={`transition-colors cursor-pointer p-1.5 rounded-lg ${
                activeView === "daily-minimum" 
                  ? "text-indigo-400 bg-indigo-500/5" 
                  : settings.theme === "light" ? "text-zinc-500 hover:text-zinc-800 hover:bg-black/5" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
              title="Daily Minimum"
            >
              <CheckCircle className="w-5.5 h-5.5" />
            </button>
            <button
              onClick={() => setActiveView("dashboard")}
              className={`transition-colors cursor-pointer p-1.5 rounded-lg ${
                activeView === "dashboard" 
                  ? "text-indigo-400 bg-indigo-500/5" 
                  : settings.theme === "light" ? "text-zinc-500 hover:text-zinc-800 hover:bg-black/5" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
              title="Performance Dashboard"
            >
              <Activity className="w-5.5 h-5.5" />
            </button>
            <button
              onClick={() => setActiveView("achievements")}
              className={`transition-colors cursor-pointer p-1.5 rounded-lg ${
                activeView === "achievements" 
                  ? "text-indigo-400 bg-indigo-500/5" 
                  : settings.theme === "light" ? "text-zinc-500 hover:text-zinc-800 hover:bg-black/5" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
              title="Achievements"
            >
              <Award className="w-5.5 h-5.5" />
            </button>
            <button
              onClick={() => setActiveView("settings")}
              className={`transition-colors cursor-pointer p-1.5 rounded-lg ${
                activeView === "settings" 
                  ? "text-indigo-400 bg-indigo-500/5" 
                  : settings.theme === "light" ? "text-zinc-500 hover:text-zinc-800 hover:bg-black/5" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
              title="Configuration"
            >
              <Settings className="w-5.5 h-5.5" />
            </button>
          </nav>
        </div>
        <div className={`hidden md:flex w-10 h-10 rounded-full border items-center justify-center text-xs font-semibold font-mono ${
          settings.theme === "light"
            ? "border-black/20 bg-black/5 text-black/80"
            : "border-white/20 bg-white/5 text-white/80"
        }`}>
          NT
        </div>
      </aside>

      {/* Main Container Wrapper */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Upper Navigation Header Bar */}
        <header className={`min-h-20 border-b px-6 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md transition-colors ${
          settings.theme === "light"
            ? "bg-[#FAF9F6]/85 border-black/10"
            : "bg-[#080808]/85 border-white/10"
        }`}>
          <div className="flex flex-col">
            <h1 className={`text-2xl font-serif italic tracking-tight font-semibold ${
              settings.theme === "light" ? "text-zinc-900" : "text-white"
            }`}>
              {activeView === "home" ? "Cognitive Studio" : 
               activeView === "daily-minimum" ? "Essential Baseline" :
               activeView === "dashboard" ? "Performance Analytics" : 
               activeView === "achievements" ? "Neural Milestones" : 
               activeView === "settings" ? "Configuration Studio" : "Active Training"}
            </h1>
            <p className={`text-[10px] uppercase tracking-widest font-mono font-medium ${
              settings.theme === "light" ? "text-zinc-500" : "text-white/40"
            }`}>
              Session {userStats.sessions.length + 1} • {new Date().toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>

          {/* Gamification Indicator Header Hub */}
          <div className="flex flex-wrap items-center gap-6 md:gap-8">
            {/* Streak Counter */}
            <div className="flex flex-col items-end">
              <span className={`text-[9px] uppercase tracking-widest font-mono ${settings.theme === "light" ? "text-zinc-500" : "text-white/30"}`}>Streak</span>
              <span className="text-lg font-mono font-semibold text-orange-400 flex items-center gap-1">
                <Flame className="w-4 h-4 fill-current animate-pulse text-orange-500" />
                {userStats.streak} {userStats.streak === 1 ? "Day" : "Days"}
              </span>
            </div>

            {/* Level Counter */}
            <div className="flex flex-col items-end">
              <span className={`text-[9px] uppercase tracking-widest font-mono ${settings.theme === "light" ? "text-zinc-500" : "text-white/30"}`}>Level</span>
              <span className={`text-lg font-mono font-semibold ${settings.theme === "light" ? "text-zinc-800" : "text-white"}`}>
                Lvl {userStats.level}
              </span>
            </div>

            {/* XP progress bar */}
            <div className="hidden sm:flex flex-col items-end justify-center w-32">
              <div className="flex justify-between w-full text-[9px] font-mono text-zinc-500 mb-1">
                <span>XP</span>
                <span>{currentLevelXpProgress}/1000</span>
              </div>
              <div className={`w-full h-1 rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${xpProgressBarPercentage}%` }}
                />
              </div>
            </div>

            <div className={`h-8 w-[1px] hidden md:block ${settings.theme === "light" ? "bg-black/10" : "bg-white/10"}`} />

            {/* Quick Control Bar icons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveSettings({ ...settings, timerSounds: !settings.timerSounds })}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  settings.theme === "light"
                    ? "bg-black/5 border-black/10 text-zinc-600 hover:text-black"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                }`}
                title={settings.timerSounds ? "Mute sound" : "Enable sound"}
              >
                {settings.timerSounds ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
              </button>
              <button
                onClick={toggleFullscreenMode}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  settings.theme === "light"
                    ? "bg-black/5 border-black/10 text-zinc-600 hover:text-black"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                }`}
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Content Wrapper Section */}
        <div className="flex-1 p-6 md:p-8">

        {/* Home Page Content View */}
        {activeView === "home" && (
          <div className="space-y-8 animate-fade-in">
            {/* Top Row: Welcome & Daily Challenge banner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Greeting */}
              <div className={`lg:col-span-4 p-6 rounded-3xl flex flex-col justify-between transition-colors ${
                settings.theme === "light"
                  ? "bg-[#F2F0EA] border border-black/5"
                  : "bg-[#111] border border-white/5"
              }`}>
                <div>
                  <h2 className={`text-xl font-serif italic tracking-tight font-semibold flex items-center gap-2 ${
                    settings.theme === "light" ? "text-zinc-800" : "text-white"
                  }`}>
                    Neurons Aligned <Sparkles className="w-5 h-5 text-yellow-400" />
                  </h2>
                  <p className={`text-xs leading-relaxed mt-3 ${
                    settings.theme === "light" ? "text-zinc-600" : "text-white/50"
                  }`}>
                    Welcome to your custom mental gym. Consistent neuroplastic training builds stronger focus locks, expands peripheral rod detection, and enhances executive memory load capacity.
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setActiveView("dashboard")}
                    className={`flex-1 py-3 font-sans font-semibold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                      settings.theme === "light"
                        ? "bg-indigo-600/5 hover:bg-indigo-600/10 text-indigo-700 border-indigo-600/20"
                        : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/20"
                    }`}
                  >
                    <Activity className="w-4 h-4" /> View Brain Profile
                  </button>
                </div>
              </div>

              {/* Right Column: Daily Challenge Widget */}
              <div className={`lg:col-span-8 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between border transition-colors ${
                settings.theme === "light"
                  ? "bg-[#EAE7DF] border-black/10"
                  : "bg-[#0A0A0A] border-white/10"
              }`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      settings.theme === "light"
                        ? "text-indigo-800 bg-indigo-600/10 border border-indigo-600/20"
                        : "text-amber-400 bg-amber-400/10 border border-amber-400/20"
                    }`}>
                      Daily Challenge
                    </span>
                    <h2 className={`text-lg font-serif italic font-semibold mt-2 ${
                      settings.theme === "light" ? "text-zinc-900" : "text-white"
                    }`}>
                      Precision Matrix Sweep
                    </h2>
                    <p className={`text-xs mt-1 max-w-md ${
                      settings.theme === "light" ? "text-zinc-600" : "text-white/40"
                    }`}>
                      Achieve <strong>80% or greater accuracy</strong> on any mental task in a single session block today.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-zinc-500 block font-mono">Bonus Reward</span>
                    <span className={`text-lg font-mono font-black ${
                      settings.theme === "light" ? "text-indigo-600" : "text-indigo-400"
                    }`}>+250 XP</span>
                  </div>
                </div>

                <div className={`flex justify-between items-center mt-6 pt-4 border-t ${
                  settings.theme === "light" ? "border-black/5" : "border-white/5"
                }`}>
                  <span className={`text-xs font-mono ${
                    settings.theme === "light" ? "text-zinc-500" : "text-white/30"
                  }`}>
                    Status: {userStats.dailyChallengeCompleted ? "Completed today!" : "Pending complete"}
                  </span>
                  {userStats.dailyChallengeCompleted ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                      <CheckCircle className="w-4 h-4 fill-current" /> Claimed Reward
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveView(ExerciseId.FLASH_LETTER)}
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1 cursor-pointer"
                    >
                      Train Now <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Core Exercises Bento Matrix Grid Section */}
            <div>
              <h2 className={`text-xs font-semibold uppercase font-mono tracking-wider mb-6 flex items-center gap-2 ${
                settings.theme === "light" ? "text-zinc-500" : "text-white/40"
              }`}>
                <Sparkles className="w-4 h-4 text-indigo-400" /> Cognitive Fitness Modules
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Flash Letter Memory Card */}
                <div 
                  onClick={() => setActiveView(ExerciseId.FLASH_LETTER)}
                  className={`p-5 rounded-2xl flex flex-col justify-between h-56 border transition-all cursor-pointer group relative ${
                    settings.theme === "light"
                      ? "bg-[#F2F0EA] border-black/5 hover:border-indigo-600/50"
                      : "bg-[#111] border-white/5 hover:border-indigo-500/50"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 font-mono text-xs font-semibold">
                        Ab
                      </div>
                      <span className="text-[9px] font-mono uppercase text-indigo-400 tracking-widest">
                        EX_01
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-semibold group-hover:text-indigo-300 transition-colors ${
                      settings.theme === "light" ? "text-zinc-800" : "text-white"
                    }`}>
                      Flash Letter Memory
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1.5 ${
                      settings.theme === "light" ? "text-zinc-500" : "text-white/40"
                    }`}>
                      Recall letter frequencies from dynamic flashed grids. Establishes mental retention frames.
                    </p>
                  </div>
                  <div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((userStats.bestScores[ExerciseId.FLASH_LETTER] || 0) / 200) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 uppercase">
                      <span>Grid retention</span>
                      <span>Best: {userStats.bestScores[ExerciseId.FLASH_LETTER] || 0} pts</span>
                    </div>
                  </div>
                </div>

                {/* 2. Flash Number Memory Card */}
                <div 
                  onClick={() => setActiveView(ExerciseId.FLASH_NUMBER)}
                  className={`p-5 rounded-2xl flex flex-col justify-between h-56 border transition-all cursor-pointer group relative ${
                    settings.theme === "light"
                      ? "bg-[#F2F0EA] border-black/5 hover:border-rose-600/50"
                      : "bg-[#111] border-white/5 hover:border-rose-500/50"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 font-mono text-xs font-semibold">
                        12
                      </div>
                      <span className="text-[9px] font-mono uppercase text-rose-400 tracking-widest">
                        EX_02
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-semibold group-hover:text-rose-300 transition-colors ${
                      settings.theme === "light" ? "text-zinc-800" : "text-white"
                    }`}>
                      Flash Number Memory
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1.5 ${
                      settings.theme === "light" ? "text-zinc-500" : "text-white/40"
                    }`}>
                      Reproduce increasing numerical streams. Reinforces digit span buffers.
                    </p>
                  </div>
                  <div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                      <div 
                        className="h-full bg-rose-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((userStats.bestScores[ExerciseId.FLASH_NUMBER] || 0) / 200) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 uppercase">
                      <span>Digit Span</span>
                      <span>Best: {userStats.bestScores[ExerciseId.FLASH_NUMBER] || 0} pts</span>
                    </div>
                  </div>
                </div>

                {/* 3. Flash Sentence Recall Card */}
                <div 
                  onClick={() => setActiveView(ExerciseId.FLASH_SENTENCE)}
                  className={`p-5 rounded-2xl flex flex-col justify-between h-56 border transition-all cursor-pointer group relative ${
                    settings.theme === "light"
                      ? "bg-[#F2F0EA] border-black/5 hover:border-emerald-600/50"
                      : "bg-[#111] border-white/5 hover:border-emerald-500/50"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono uppercase text-emerald-400 tracking-widest">
                        EX_03
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-semibold group-hover:text-emerald-300 transition-colors ${
                      settings.theme === "light" ? "text-zinc-800" : "text-white"
                    }`}>
                      Flash Sentence Recall
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1.5 ${
                      settings.theme === "light" ? "text-zinc-500" : "text-white/40"
                    }`}>
                      Type back complete flashed sentences. Extends vocabulary load.
                    </p>
                  </div>
                  <div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((userStats.bestScores[ExerciseId.FLASH_SENTENCE] || 0) / 300) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 uppercase">
                      <span>Sentence Span</span>
                      <span>Best: {userStats.bestScores[ExerciseId.FLASH_SENTENCE] || 0} pts</span>
                    </div>
                  </div>
                </div>

                {/* 4. Flash Paragraph Recall Card */}
                <div 
                  onClick={() => setActiveView(ExerciseId.FLASH_PARAGRAPH)}
                  className={`p-5 rounded-2xl flex flex-col justify-between h-56 border transition-all cursor-pointer group relative ${
                    settings.theme === "light"
                      ? "bg-[#F2F0EA] border-black/5 hover:border-purple-600/50"
                      : "bg-[#111] border-white/5 hover:border-purple-500/50"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono uppercase text-purple-400 tracking-widest">
                        EX_04
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-semibold group-hover:text-purple-300 transition-colors ${
                      settings.theme === "light" ? "text-zinc-800" : "text-white"
                    }`}>
                      Flash Paragraph Recall
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1.5 ${
                      settings.theme === "light" ? "text-zinc-500" : "text-white/40"
                    }`}>
                      Scan complex paragraph structures, then reconstruct semantic details.
                    </p>
                  </div>
                  <div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                      <div 
                        className="h-full bg-purple-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((userStats.bestScores[ExerciseId.FLASH_PARAGRAPH] || 0) / 400) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 uppercase">
                      <span>Semantic Recall</span>
                      <span>Best: {userStats.bestScores[ExerciseId.FLASH_PARAGRAPH] || 0} pts</span>
                    </div>
                  </div>
                </div>

                {/* 5. Peripheral Vision Trainer Card */}
                <div 
                  onClick={() => setActiveView(ExerciseId.PERIPHERAL_VISION)}
                  className={`p-5 rounded-2xl flex flex-col justify-between h-56 border transition-all cursor-pointer group relative ${
                    settings.theme === "light"
                      ? "bg-[#F2F0EA] border-black/5 hover:border-emerald-600/50"
                      : "bg-[#111] border-white/5 hover:border-emerald-500/50"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <Eye className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono uppercase text-emerald-400 tracking-widest">
                        EX_05
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-semibold group-hover:text-emerald-300 transition-colors ${
                      settings.theme === "light" ? "text-zinc-800" : "text-white"
                    }`}>
                      Peripheral Vision
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1.5 ${
                      settings.theme === "light" ? "text-zinc-500" : "text-white/40"
                    }`}>
                      Expand visual coordinates using rapid off-center visual prompts.
                    </p>
                  </div>
                  <div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((userStats.bestScores[ExerciseId.PERIPHERAL_VISION] || 0) / 150) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 uppercase">
                      <span>Focal Span</span>
                      <span>Best: {userStats.bestScores[ExerciseId.PERIPHERAL_VISION] || 0} pts</span>
                    </div>
                  </div>
                </div>

                {/* 6. Chunk Reading Trainer Card */}
                <div 
                  onClick={() => setActiveView(ExerciseId.CHUNK_READING)}
                  className={`p-5 rounded-2xl flex flex-col justify-between h-56 border transition-all cursor-pointer group relative ${
                    settings.theme === "light"
                      ? "bg-[#F2F0EA] border-black/5 hover:border-amber-600/50"
                      : "bg-[#111] border-white/5 hover:border-amber-500/50"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                        <Activity className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono uppercase text-amber-400 tracking-widest">
                        EX_06
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-semibold group-hover:text-amber-300 transition-colors ${
                      settings.theme === "light" ? "text-zinc-800" : "text-white"
                    }`}>
                      Chunk Reading Trainer
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1.5 ${
                      settings.theme === "light" ? "text-zinc-500" : "text-white/40"
                    }`}>
                      Ingest whole word chunks at high velocity to bypass sub-vocalization.
                    </p>
                  </div>
                  <div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                      <div 
                        className="h-full bg-amber-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((userStats.bestScores[ExerciseId.CHUNK_READING] || 0) / 300) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 uppercase">
                      <span>Chunk Processing</span>
                      <span>Best: {userStats.bestScores[ExerciseId.CHUNK_READING] || 0} pts</span>
                    </div>
                  </div>
                </div>

                {/* 7. RSVP Speed Reading Card */}
                <div 
                  onClick={() => setActiveView(ExerciseId.RSVP_SPEED_READING)}
                  className={`p-5 rounded-2xl flex flex-col justify-between h-56 border transition-all cursor-pointer group relative ${
                    settings.theme === "light"
                      ? "bg-[#F2F0EA] border-black/5 hover:border-indigo-600/50"
                      : "bg-[#111] border-white/5 hover:border-indigo-500/50"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 font-mono text-xs font-semibold">
                        Wp
                      </div>
                      <span className="text-[9px] font-mono uppercase text-indigo-400 tracking-widest">
                        EX_07
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-semibold group-hover:text-indigo-300 transition-colors ${
                      settings.theme === "light" ? "text-zinc-800" : "text-white"
                    }`}>
                      RSVP Speed Reading
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1.5 ${
                      settings.theme === "light" ? "text-zinc-500" : "text-white/40"
                    }`}>
                      Rapid single-word serial streaming. Trains high rate parsing.
                    </p>
                  </div>
                  <div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((userStats.bestScores[ExerciseId.RSVP_SPEED_READING] || 0) / 600) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 uppercase">
                      <span>Streaming Rate</span>
                      <span>Best: {userStats.bestScores[ExerciseId.RSVP_SPEED_READING] || 0} pts</span>
                    </div>
                  </div>
                </div>

                {/* 8. Word Group Trainer Card */}
                <div 
                  onClick={() => setActiveView(ExerciseId.WORD_GROUP)}
                  className={`p-5 rounded-2xl flex flex-col justify-between h-56 border transition-all cursor-pointer group relative ${
                    settings.theme === "light"
                      ? "bg-[#F2F0EA] border-black/5 hover:border-purple-600/50"
                      : "bg-[#111] border-white/5 hover:border-purple-500/50"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono uppercase text-purple-400 tracking-widest">
                        EX_08
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-semibold group-hover:text-purple-300 transition-colors ${
                      settings.theme === "light" ? "text-zinc-800" : "text-white"
                    }`}>
                      Word Group Flash
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1.5 ${
                      settings.theme === "light" ? "text-zinc-500" : "text-white/40"
                    }`}>
                      Capture unrelated horizontal word sequences instantly to expand fixation.
                    </p>
                  </div>
                  <div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                      <div 
                        className="h-full bg-purple-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((userStats.bestScores[ExerciseId.WORD_GROUP] || 0) / 250) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 uppercase">
                      <span>Horizontal Fixation</span>
                      <span>Best: {userStats.bestScores[ExerciseId.WORD_GROUP] || 0} pts</span>
                    </div>
                  </div>
                </div>

                {/* 9. Visual Pattern Memory Card */}
                <div 
                  onClick={() => setActiveView(ExerciseId.VISUAL_PATTERN)}
                  className={`p-5 rounded-2xl flex flex-col justify-between h-56 border transition-all cursor-pointer group relative ${
                    settings.theme === "light"
                      ? "bg-[#F2F0EA] border-black/5 hover:border-indigo-600/50"
                      : "bg-[#111] border-white/5 hover:border-indigo-500/50"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Brain className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono uppercase text-indigo-400 tracking-widest">
                        EX_09
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-semibold group-hover:text-indigo-300 transition-colors ${
                      settings.theme === "light" ? "text-zinc-800" : "text-white"
                    }`}>
                      Visual Pattern Memory
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1.5 ${
                      settings.theme === "light" ? "text-zinc-500" : "text-white/40"
                    }`}>
                      Recreate flashing matrix patterns. Sharpens spatial layout retention.
                    </p>
                  </div>
                  <div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((userStats.bestScores[ExerciseId.VISUAL_PATTERN] || 0) / 250) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 uppercase">
                      <span>Spatial Memory</span>
                      <span>Best: {userStats.bestScores[ExerciseId.VISUAL_PATTERN] || 0} pts</span>
                    </div>
                  </div>
                </div>

                {/* 10. Dual N-Back Card */}
                <div 
                  onClick={() => setActiveView(ExerciseId.DUAL_N_BACK)}
                  className={`p-5 rounded-2xl flex flex-col justify-between h-56 border transition-all cursor-pointer group relative ${
                    settings.theme === "light"
                      ? "bg-[#F2F0EA] border-black/5 hover:border-rose-600/50"
                      : "bg-[#111] border-white/5 hover:border-rose-500/50"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                        <Brain className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono uppercase text-rose-400 tracking-widest">
                        EX_10
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-semibold group-hover:text-rose-300 transition-colors ${
                      settings.theme === "light" ? "text-zinc-800" : "text-white"
                    }`}>
                      Dual N-Back
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1.5 ${
                      settings.theme === "light" ? "text-zinc-500" : "text-white/40"
                    }`}>
                      Professional continuous visual-auditory matching match for working memory slots.
                    </p>
                  </div>
                  <div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${settings.theme === "light" ? "bg-black/10" : "bg-white/5"}`}>
                      <div 
                        className="h-full bg-rose-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, ((userStats.bestScores[ExerciseId.DUAL_N_BACK] || 0) / 150) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 uppercase">
                      <span>Executive Slots</span>
                      <span>Best: {userStats.bestScores[ExerciseId.DUAL_N_BACK] || 0} pts</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Daily Minimum Baseline View */}
        {activeView === "daily-minimum" && (
          <DailyMinimum 
            settings={settings}
            userStats={userStats}
            onStartExercise={(exerciseId) => {
              setComingFromDailyMin(true);
              setActiveView(exerciseId);
            }}
            onLogSession={handleSessionComplete}
          />
        )}

        {/* Dashboard View */}
        {activeView === "dashboard" && (
          <div className="space-y-6">
            <button
              onClick={() => setActiveView("home")}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              ← Return Home
            </button>
            <Dashboard stats={userStats} />
          </div>
        )}

        {/* Achievements / Medals Gallery View */}
        {activeView === "achievements" && (
          <div className="space-y-6 animate-fade-in">
            <button
              onClick={() => setActiveView("home")}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              ← Return Home
            </button>
            
            <div className="bg-zinc-900/40 border border-zinc-800/80 p-8 rounded-3xl max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-sans text-white flex items-center gap-2">
                  <Award className="text-amber-400 w-7 h-7" /> Neural Milestones & Medals
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Check achievements, credentials, and earned XP bonuses.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ACHIEVEMENTS_POOL.map(ach => {
                  const isUnlocked = userStats.unlockedAchievements.includes(ach.id);
                  return (
                    <div 
                      key={ach.id}
                      className={`p-5 rounded-2xl border flex items-center gap-4 transition-all ${
                        isUnlocked 
                          ? "bg-zinc-900/60 border-emerald-500/20 text-white" 
                          : "bg-zinc-950/40 border-zinc-900 text-zinc-500 opacity-60"
                      }`}
                    >
                      <div className="text-3xl p-3 bg-zinc-900 rounded-xl">{ach.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-sans font-bold text-sm">{ach.title}</span>
                          {isUnlocked && (
                            <span className="text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                              Unlocked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{ach.description}</p>
                        <span className="text-[10px] font-mono text-zinc-500 block mt-2">
                          Reward: +{ach.xpReward} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Settings view */}
        {activeView === "settings" && (
          <div className="space-y-6 animate-fade-in">
            <button
              onClick={() => setActiveView("home")}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              ← Return Home
            </button>

            <div className="bg-zinc-900/40 border border-zinc-800/80 p-8 rounded-3xl max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-sans text-white">General Configuration</h2>
                <p className="text-xs text-zinc-400 mt-1">Customize local scale logic, feedback audio settings, and profiles.</p>
              </div>

              <div className="space-y-5 border-t border-zinc-800/60 pt-6">
                {/* 1. Theme Selection */}
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold font-sans block">Visual Style Theme</span>
                    <p className="text-xs text-zinc-500">Choose between Default Dark mode or soft off-white Light mode.</p>
                  </div>
                  <div className="flex bg-zinc-950 border border-zinc-850 p-1 rounded-xl">
                    <button
                      onClick={() => saveSettings({ ...settings, theme: "dark" })}
                      className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                        settings.theme === "dark" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Dark
                    </button>
                    <button
                      onClick={() => saveSettings({ ...settings, theme: "light" })}
                      className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                        settings.theme === "light" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Light
                    </button>
                  </div>
                </div>

                {/* 2. Difficulty Auto-Scaling */}
                <div className="flex justify-between items-center pt-3 border-t border-zinc-900">
                  <div>
                    <span className="text-sm font-semibold font-sans block">Difficulty Auto-Scaling</span>
                    <p className="text-xs text-zinc-500">Automatically adjust parameters based on accuracy outcomes.</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ ...settings, difficultyAutoScaling: !settings.difficultyAutoScaling })}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.difficultyAutoScaling ? "bg-blue-600" : "bg-zinc-800"
                    }`}
                  >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.difficultyAutoScaling ? "translate-x-6" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {/* 3. Audio synthesis toggle */}
                <div className="flex justify-between items-center pt-3 border-t border-zinc-900">
                  <div>
                    <span className="text-sm font-semibold font-sans block">Timer & Interface Audio</span>
                    <p className="text-xs text-zinc-500">Synthesize chimes, ticks, and Dual N-Back spoken letters.</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ ...settings, timerSounds: !settings.timerSounds })}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.timerSounds ? "bg-blue-600" : "bg-zinc-800"
                    }`}
                  >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.timerSounds ? "translate-x-6" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {/* 4. Reset options */}
                <div className="pt-6 border-t border-zinc-800">
                  <h3 className="text-xs uppercase font-mono tracking-wider text-rose-500 font-bold mb-3">
                    Danger Zone
                  </h3>
                  <div className="flex justify-between items-center p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                    <div>
                      <span className="text-sm font-semibold text-rose-400 block font-sans">Reset Synaptic Progress</span>
                      <p className="text-xs text-zinc-500">Wipes all stored metrics, high scores, achievements and streaking history.</p>
                    </div>
                    <button
                      onClick={handleResetProgress}
                      className="px-4 py-2 bg-rose-950/20 text-rose-400 border border-rose-500/20 hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Wipe All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Active Exercise Wrapper */}
        {activeView !== "home" && activeView !== "daily-minimum" && activeView !== "dashboard" && activeView !== "settings" && activeView !== "achievements" && (
          <div className="space-y-6">
            <div className="max-w-2xl mx-auto flex justify-between items-center bg-zinc-900/30 border border-zinc-800/40 px-5 py-3 rounded-2xl backdrop-blur-sm">
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to exit active training? Any current session state will be lost.")) {
                    setActiveView(comingFromDailyMin ? "daily-minimum" : "home");
                    setComingFromDailyMin(false);
                  }
                }}
                className="px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white rounded-lg text-xs font-sans font-semibold transition-all cursor-pointer border border-zinc-750"
              >
                {comingFromDailyMin ? "✕ Return to Baseline" : "✕ Abort Training"}
              </button>
              <span className="text-xs text-zinc-500 font-mono">
                Pacing Mode: {settings.difficultyAutoScaling ? "Dynamic Scaling" : "Manual Limits"}
              </span>
            </div>
            
            {/* Render actual target game component */}
            {renderActiveExercise()}
          </div>
        )}

      </div>
      </main>
    </div>
  );
}
