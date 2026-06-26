/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Synthesize premium UI and cognitive feedback sounds using Web Audio API.
// Dual N-Back audio letters are synthesized using SpeechSynthesis.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSynthBeep(frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    // Smooth decay
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn("Audio synthesis ignored/failed due to user interaction state", error);
  }
}

// Tick-tock for timers
export function playTickSound() {
  playSynthBeep(800, "sine", 0.05, 0.05);
}

// Success chime (double high note)
export function playSuccessSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  // High note 1
  playSynthBeep(523.25, "triangle", 0.15, 0.1); // C5
  // High note 2 after 100ms
  setTimeout(() => {
    playSynthBeep(659.25, "triangle", 0.2, 0.1); // E5
  }, 100);
}

// Failure buzzer (low discordant note)
export function playFailureSound() {
  playSynthBeep(130, "sawtooth", 0.25, 0.12); // Low C3
  setTimeout(() => {
    playSynthBeep(120, "sawtooth", 0.25, 0.12);
  }, 50);
}

// Level up sound (triumphant sweep)
export function playLevelUpSound() {
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      playSynthBeep(freq, "sine", 0.2, 0.1);
    }, idx * 100);
  });
}

// Speak letters for Dual N-Back using built-in SpeechSynthesis
export function speakLetter(letter: string, soundEnabled: boolean = true) {
  if (!soundEnabled) return;
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Cancel active speech
      const utterance = new SpeechSynthesisUtterance(letter.toLowerCase());
      utterance.rate = 1.3; // slightly faster for quick pacing
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      // Get an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(v => v.lang.startsWith("en"));
      if (engVoice) {
        utterance.voice = engVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback beep patterns for browsers without speech synthesis
      const charCode = letter.charCodeAt(0) - 65; // A=0, B=1, ...
      playSynthBeep(440 + charCode * 50, "sine", 0.15, 0.1);
    }
  } catch (error) {
    console.warn("Speech synthesis error:", error);
  }
}
