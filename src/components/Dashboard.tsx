/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { 
  TrendingUp, 
  Clock, 
  Brain, 
  Eye, 
  BookOpen, 
  Award, 
  Download, 
  Flame, 
  Zap, 
  History, 
  Calendar,
  Activity,
  AwardIcon
} from "lucide-react";
import { ExerciseSession, UserStats, ExerciseId } from "../types";

// Human-friendly titles for exercises
const EXERCISE_NAMES: Record<ExerciseId, string> = {
  [ExerciseId.FLASH_LETTER]: "Flash Letter Memory",
  [ExerciseId.FLASH_NUMBER]: "Flash Number Memory",
  [ExerciseId.FLASH_SENTENCE]: "Flash Sentence Recall",
  [ExerciseId.FLASH_PARAGRAPH]: "Flash Paragraph Recall",
  [ExerciseId.PERIPHERAL_VISION]: "Peripheral Vision",
  [ExerciseId.CHUNK_READING]: "Chunk Reading Trainer",
  [ExerciseId.RSVP_SPEED_READING]: "RSVP Speed Reading",
  [ExerciseId.WORD_GROUP]: "Word Group Flash",
  [ExerciseId.VISUAL_PATTERN]: "Visual Pattern Memory",
  [ExerciseId.DUAL_N_BACK]: "Dual N-Back"
};

interface DashboardProps {
  stats: UserStats;
  onClose?: () => void;
}

export default function Dashboard({ stats }: DashboardProps) {
  const { sessions } = stats;

  // Export progress as CSV
  const handleExportCSV = () => {
    if (sessions.length === 0) return;
    const headers = ["Session ID", "Exercise", "Date", "Duration (s)", "Accuracy (%)", "Reaction Time (ms)", "Difficulty", "Score"];
    const rows = sessions.map(s => [
      s.id,
      EXERCISE_NAMES[s.exerciseId] || s.exerciseId,
      new Date(s.date).toLocaleString(),
      s.durationSec,
      s.accuracy.toFixed(1),
      s.reactionTimeMs.toFixed(0),
      s.difficulty,
      s.score
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `neurotrain_progress_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pre-calculate cognitive metrics
  const cognitiveMetrics = useMemo(() => {
    // 1. Estimated Reading Speed
    const readingSessions = sessions.filter(s => 
      s.exerciseId === ExerciseId.RSVP_SPEED_READING || s.exerciseId === ExerciseId.CHUNK_READING
    );
    const maxReadingSpeed = readingSessions.length > 0 
      ? Math.max(...readingSessions.map(s => s.details?.wpm || 250)) 
      : 250;

    // 2. Estimated Visual Span (based on letter/number flash grid size or peripheral vision)
    const flashSessions = sessions.filter(s => 
      s.exerciseId === ExerciseId.FLASH_LETTER || s.exerciseId === ExerciseId.FLASH_NUMBER
    );
    const maxGridSize = flashSessions.length > 0 
      ? Math.max(...flashSessions.map(s => s.difficulty)) // grid size e.g. 3, 4, 5
      : 3;
    const visualSpanEstimate = Math.min(25, maxGridSize * maxGridSize + 4);

    // 3. Working Memory Span (Dual N-Back score or visual memory score)
    const nbackSessions = sessions.filter(s => s.exerciseId === ExerciseId.DUAL_N_BACK);
    const maxNBack = nbackSessions.length > 0 
      ? Math.max(...nbackSessions.map(s => s.difficulty)) 
      : 1;
    const workingMemoryCapacity = maxNBack + 3; // Miller's law estimate offset

    // 4. Overall Accuracy
    const avgAccuracy = sessions.length > 0 
      ? sessions.reduce((acc, s) => acc + s.accuracy, 0) / sessions.length 
      : 0;

    // 5. Avg Reaction Time
    const avgReactionTime = sessions.length > 0 
      ? sessions.reduce((acc, s) => acc + s.reactionTimeMs, 0) / sessions.length 
      : 0;

    return {
      maxReadingSpeed,
      visualSpanEstimate,
      workingMemoryCapacity,
      avgAccuracy,
      avgReactionTime
    };
  }, [sessions]);

  // Compute stats over last 7 sessions for the trend charts
  const recentTrendData = useMemo(() => {
    if (sessions.length === 0) return [];
    // Take up to 10 most recent sessions and order them chronologically
    return [...sessions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10);
  }, [sessions]);

  // SVG Chart rendering helpers
  const renderAccuracyChart = () => {
    const data = recentTrendData;
    if (data.length < 2) {
      return (
        <div className="h-44 flex items-center justify-center text-zinc-500 font-mono text-sm border border-dashed border-zinc-800 rounded-lg">
          Complete at least 2 sessions to visualize accuracy trends
        </div>
      );
    }

    const width = 500;
    const height = 150;
    const padding = 25;
    
    // Scale functions
    const xScale = (index: number) => padding + (index / (data.length - 1)) * (width - padding * 2);
    const yScale = (val: number) => height - padding - (val / 100) * (height - padding * 2);

    // Create Path
    let pathD = `M ${xScale(0)} ${yScale(data[0].accuracy)}`;
    let areaD = `M ${xScale(0)} ${height - padding} L ${xScale(0)} ${yScale(data[0].accuracy)}`;

    for (let i = 1; i < data.length; i++) {
      pathD += ` L ${xScale(i)} ${yScale(data[i].accuracy)}`;
      areaD += ` L ${xScale(i)} ${yScale(data[i].accuracy)}`;
    }
    areaD += ` L ${xScale(data.length - 1)} ${height - padding} Z`;

    return (
      <div className="w-full relative overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          <defs>
            <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <line x1={padding} y1={yScale(50)} x2={width - padding} y2={yScale(50)} stroke="#27272a" strokeDasharray="3" />
          <line x1={padding} y1={yScale(100)} x2={width - padding} y2={yScale(100)} stroke="#27272a" strokeDasharray="3" />
          <text x={padding - 5} y={yScale(50) + 4} fill="#71717a" fontSize="10" textAnchor="end" className="font-mono">50%</text>
          <text x={padding - 5} y={yScale(100) + 4} fill="#71717a" fontSize="10" textAnchor="end" className="font-mono">100%</text>

          {/* Shaded Area */}
          <path d={areaD} fill="url(#accuracyGrad)" />
          
          {/* Main Line */}
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Dots */}
          {data.map((s, idx) => (
            <g key={s.id}>
              <circle 
                cx={xScale(idx)} 
                cy={yScale(s.accuracy)} 
                r="4" 
                fill="#18181b" 
                stroke="#3b82f6" 
                strokeWidth="2" 
              />
              <title>{`${EXERCISE_NAMES[s.exerciseId]}: ${s.accuracy.toFixed(0)}%`}</title>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const renderReactionTimeChart = () => {
    const data = recentTrendData;
    if (data.length < 2) {
      return (
        <div className="h-44 flex items-center justify-center text-zinc-500 font-mono text-sm border border-dashed border-zinc-800 rounded-lg">
          Complete at least 2 sessions to visualize reaction speeds
        </div>
      );
    }

    const width = 500;
    const height = 150;
    const padding = 25;
    
    // Find max reaction time to scale nicely
    const maxRt = Math.max(...data.map(s => s.reactionTimeMs), 1000);
    const yScale = (val: number) => height - padding - (val / maxRt) * (height - padding * 2);
    const xScale = (index: number) => padding + (index / (data.length - 1)) * (width - padding * 2);

    let pathD = `M ${xScale(0)} ${yScale(data[0].reactionTimeMs)}`;
    for (let i = 1; i < data.length; i++) {
      pathD += ` L ${xScale(i)} ${yScale(data[i].reactionTimeMs)}`;
    }

    return (
      <div className="w-full relative overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={yScale(maxRt / 2)} x2={width - padding} y2={yScale(maxRt / 2)} stroke="#27272a" strokeDasharray="3" />
          <line x1={padding} y1={yScale(100)} x2={width - padding} y2={yScale(100)} stroke="#27272a" strokeDasharray="3" />
          <text x={padding - 5} y={yScale(maxRt / 2) + 4} fill="#71717a" fontSize="10" textAnchor="end" className="font-mono">{(maxRt / 2).toFixed(0)}ms</text>
          <text x={padding - 5} y={yScale(100) + 4} fill="#71717a" fontSize="10" textAnchor="end" className="font-mono">100ms</text>

          {/* Main Line */}
          <path d={pathD} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Dots */}
          {data.map((s, idx) => (
            <g key={s.id}>
              <circle 
                cx={xScale(idx)} 
                cy={yScale(s.reactionTimeMs)} 
                r="4" 
                fill="#18181b" 
                stroke="#f43f5e" 
                strokeWidth="2" 
              />
              <title>{`${EXERCISE_NAMES[s.exerciseId]}: ${s.reactionTimeMs.toFixed(0)} ms`}</title>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in p-1" id="progress-dashboard">
      {/* Title & Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-sans font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="text-emerald-400 w-8 h-8" /> Progress Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Analyze your performance metrics, visual acuity limits, and memory capacity indicators.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            disabled={sessions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 text-white rounded-lg transition-all text-sm font-medium cursor-pointer"
            id="btn-export-csv"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Gamification Highlights & Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 block uppercase font-mono tracking-wider">Daily Streak</span>
            <span className="text-2xl font-bold text-white">{stats.streak} {stats.streak === 1 ? "Day" : "Days"}</span>
          </div>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 block uppercase font-mono tracking-wider">Level {stats.level}</span>
            <span className="text-2xl font-bold text-white">{stats.xp} <span className="text-xs text-zinc-500">XP</span></span>
          </div>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 block uppercase font-mono tracking-wider">Total Training</span>
            <span className="text-2xl font-bold text-white">{sessions.length} <span className="text-xs text-zinc-500">Sessions</span></span>
          </div>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 block uppercase font-mono tracking-wider">Medals Earned</span>
            <span className="text-2xl font-bold text-white">{stats.unlockedAchievements.length}</span>
          </div>
        </div>
      </div>

      {/* Advanced Estimated Cognitive Capacity Metrics */}
      <div>
        <h2 className="text-lg font-sans font-semibold tracking-tight text-zinc-300 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-emerald-400" /> Cognitive Performance Indicators
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Reading Speed Metric */}
          <div className="bg-zinc-900/30 border border-zinc-800/60 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Reading Velocity</span>
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-3xl font-sans font-bold text-white mt-2">
                {cognitiveMetrics.maxReadingSpeed} <span className="text-base font-normal text-zinc-400">WPM</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-2">
                Your highest speed achieved using RSVP speed reading or chunk-reading exercises.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800/60">
              <div className="flex justify-between text-xs font-mono text-zinc-500">
                <span>Avg Adult: 250 WPM</span>
                <span className="text-emerald-400 font-bold">
                  {((cognitiveMetrics.maxReadingSpeed / 250) * 100).toFixed(0)}% Average
                </span>
              </div>
            </div>
          </div>

          {/* Visual Span Metric */}
          <div className="bg-zinc-900/30 border border-zinc-800/60 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Visual Span</span>
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-3xl font-sans font-bold text-white mt-2">
                {cognitiveMetrics.visualSpanEstimate.toFixed(1)} <span className="text-base font-normal text-zinc-400">Items</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-2">
                An estimate of how many symbols your peripheral and focus vision can perceive instantly in a single flash.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800/60">
              <div className="flex justify-between text-xs font-mono text-zinc-500">
                <span>Avg Adult: 7 Items</span>
                <span className="text-blue-400 font-bold">
                  Level {Math.max(1, Math.floor(cognitiveMetrics.visualSpanEstimate / 3))}
                </span>
              </div>
            </div>
          </div>

          {/* Working Memory Capacity */}
          <div className="bg-zinc-900/30 border border-zinc-800/60 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Working Memory Capacity</span>
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-3xl font-sans font-bold text-white mt-2">
                {cognitiveMetrics.workingMemoryCapacity.toFixed(1)} <span className="text-base font-normal text-zinc-400">Slots</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-2">
                Estimated items you can simultaneously track and compute in active consciousness (Dual N-Back index).
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800/60">
              <div className="flex justify-between text-xs font-mono text-zinc-500">
                <span>Typical: 4 - 7 slots</span>
                <span className="text-purple-400 font-bold">
                  {cognitiveMetrics.workingMemoryCapacity > 7 ? "High Capacity" : "Standard Capacity"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accuracy Trend */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 p-6 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-sans font-medium text-zinc-200 uppercase tracking-wider font-mono">
              Accuracy Progress (Last 10 sessions)
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Avg: {cognitiveMetrics.avgAccuracy.toFixed(1)}%
            </span>
          </div>
          {renderAccuracyChart()}
        </div>

        {/* Reaction Time Trend */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 p-6 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-sans font-medium text-zinc-200 uppercase tracking-wider font-mono">
              Reaction Speed Trend (Last 10 sessions)
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
              Avg: {cognitiveMetrics.avgReactionTime.toFixed(0)} ms
            </span>
          </div>
          {renderReactionTimeChart()}
        </div>
      </div>

      {/* Historical Logs & Best Performances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best Performances */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 p-6 rounded-2xl shadow-xl lg:col-span-1">
          <h3 className="text-sm font-sans font-medium text-zinc-200 uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
            <AwardIcon className="w-4 h-4 text-amber-400" /> Personal Bests
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {Object.values(ExerciseId).map(id => {
              const bestScore = stats.bestScores[id] || 0;
              return (
                <div key={id} className="flex justify-between items-center p-3 rounded-lg bg-zinc-950/40 border border-zinc-900/60">
                  <span className="text-xs font-sans text-zinc-400 truncate max-w-[180px]">{EXERCISE_NAMES[id]}</span>
                  <span className="text-sm font-mono font-bold text-white">{bestScore > 0 ? `${bestScore.toLocaleString()} pts` : "---"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historical Logs Table */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 p-6 rounded-2xl shadow-xl lg:col-span-2">
          <h3 className="text-sm font-sans font-medium text-zinc-200 uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" /> Detailed Session History
          </h3>
          {sessions.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-zinc-500 font-mono text-sm border border-dashed border-zinc-800 rounded-xl">
              <Calendar className="w-8 h-8 text-zinc-600 mb-2" />
              No training sessions recorded yet. Start training!
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-mono uppercase tracking-wider">
                    <th className="pb-3 pr-2">Exercise</th>
                    <th className="pb-3 pr-2">Date</th>
                    <th className="pb-3 pr-2">Accuracy</th>
                    <th className="pb-3 pr-2">Reaction Time</th>
                    <th className="pb-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {[...sessions].reverse().slice(0, 30).map((session) => (
                    <tr key={session.id} className="hover:bg-zinc-800/20">
                      <td className="py-2.5 font-sans font-medium text-white max-w-[150px] truncate">{EXERCISE_NAMES[session.exerciseId]}</td>
                      <td className="py-2.5 font-mono text-zinc-500">{new Date(session.date).toLocaleDateString()}</td>
                      <td className="py-2.5 font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          session.accuracy >= 90 ? "bg-emerald-500/10 text-emerald-400" :
                          session.accuracy >= 75 ? "bg-blue-500/10 text-blue-400" :
                          "bg-amber-500/10 text-amber-400"
                        }`}>
                          {session.accuracy.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-zinc-400">{session.reactionTimeMs.toFixed(0)} ms</td>
                      <td className="py-2.5 font-mono text-right font-bold text-white">{session.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
