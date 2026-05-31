/* ==========================================================================
   NEON TETS - Web Audio API Synthesizer (Chiptune Sound Engine)
   ========================================================================== */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.bgmVolume = null;
        this.sfxVolume = null;
        this.isEnabled = false;
        
        // BGM Sequencer state
        this.bgmInterval = null;
        this.isPlayingBGM = false;
        this.tempo = 150; // BPM
        this.currentNoteIndex = 0;
        
        // Korobeiniki (Tetris A-Theme) Melody notes and durations (in quarter beats)
        // Format: [Note Name, Octave, Duration in beats]
        this.melody = [
            ['E', 5, 2], ['B', 4, 1], ['C', 5, 1], ['D', 5, 2], ['C', 5, 1], ['B', 4, 1],
            ['A', 4, 2], ['A', 4, 1], ['C', 5, 1], ['E', 5, 2], ['D', 5, 1], ['C', 5, 1],
            ['B', 4, 3], ['C', 5, 1], ['D', 5, 2], ['E', 5, 2],
            ['C', 5, 2], ['A', 4, 2], ['A', 4, 2], ['REST', 0, 2],

            ['D', 5, 3], ['F', 5, 1], ['A', 5, 2], ['G', 5, 1], ['F', 5, 1],
            ['E', 5, 3], ['C', 5, 1], ['E', 5, 2], ['D', 5, 1], ['C', 5, 1],
            ['B', 4, 2], ['B', 4, 1], ['C', 5, 1], ['D', 5, 2], ['E', 5, 2],
            ['C', 5, 2], ['A', 4, 2], ['A', 4, 2], ['REST', 0, 2]
        ];

        // Accompanying retro bassline (simplified root notes matching the chord progression)
        this.bassline = [
            ['E', 3], ['G#', 3], ['A', 3], ['E', 3],
            ['A', 3], ['A', 3], ['E', 3], ['E', 3],
            ['G#', 3], ['E', 3], ['A', 3], ['A', 3],
            ['A', 3], ['A', 3], ['E', 3], ['E', 3],

            ['D', 3], ['D', 3], ['A', 3], ['A', 3],
            ['C', 3], ['C', 3], ['E', 3], ['E', 3],
            ['G#', 3], ['E', 3], ['A', 3], ['A', 3],
            ['A', 3], ['A', 3], ['E', 3], ['E', 3]
        ];

        // Mute state loaded from localStorage
        const savedMute = localStorage.getItem('neon_tets_muted');
        this.muted = savedMute === 'true';
    }

    /**
     * Lazy initialize the AudioContext after user gesture
     */
    init() {
        if (this.ctx) return;
        
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            
            // Master node tree setup
            this.masterVolume = this.ctx.createGain();
            this.bgmVolume = this.ctx.createGain();
            this.sfxVolume = this.ctx.createGain();
            
            this.masterVolume.connect(this.ctx.destination);
            this.bgmVolume.connect(this.masterVolume);
            this.sfxVolume.connect(this.masterVolume);

            // Set default gain levels
            this.masterVolume.gain.setValueAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime);
            this.bgmVolume.gain.setValueAtTime(0.2, this.ctx.currentTime); // keep BGM slightly softer
            this.sfxVolume.gain.setValueAtTime(0.5, this.ctx.currentTime);
            
            this.isEnabled = true;
        } catch (e) {
            console.error('Web Audio API not supported by browser', e);
        }
    }

    toggleMute() {
        this.init();
        this.muted = !this.muted;
        localStorage.setItem('neon_tets_muted', this.muted);

        if (this.ctx) {
            const targetVolume = this.muted ? 0 : 0.6;
            this.masterVolume.gain.linearRampToValueAtTime(targetVolume, this.ctx.currentTime + 0.1);
        }
        return this.muted;
    }

    // Convert notes into frequencies in Hz (A4 = 440Hz)
    getFrequency(noteName, octave) {
        if (noteName === 'REST') return 0;
        
        const noteMap = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };
        const semitones = noteMap[noteName] + (octave - 4) * 12;
        return 440 * Math.pow(2, (semitones - 9) / 12);
    }

    /**
     * Play single synth tone (Standard SFX envelope)
     */
    playTone(freq, type, duration, startVol = 0.5, endVol = 0.001) {
        if (!this.isEnabled || this.muted || freq === 0) return;
        
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(endVol, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.sfxVolume);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    /* --------------------------------------------------------------------------
       SFX Libraries
       -------------------------------------------------------------------------- */
    playMove() {
        // Short soft square blip decaying quickly
        this.playTone(120, 'square', 0.08, 0.3, 0.01);
    }

    playRotate() {
        // Quick high-pitch sweep to simulate rotating block
        if (!this.isEnabled || this.muted) return;
        this.init();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(this.sfxVolume);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playHold() {
        // Bright retro ascending chime
        const now = this.ctx ? this.ctx.currentTime : 0;
        this.playTone(this.getFrequency('E', 5), 'sine', 0.12, 0.3);
        setTimeout(() => {
            this.playTone(this.getFrequency('A', 5), 'sine', 0.15, 0.3);
        }, 60);
    }

    playDrop() {
        // Soft bassy click on lock-down
        this.playTone(80, 'triangle', 0.12, 0.6);
    }

    playLineClear() {
        // Upward arpeggio for standard lines cleared
        if (!this.isEnabled || this.muted) return;
        this.init();
        
        const notes = [
            this.getFrequency('C', 5),
            this.getFrequency('E', 5),
            this.getFrequency('G', 5),
            this.getFrequency('C', 6)
        ];
        
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'square', 0.15, 0.3);
            }, idx * 60);
        });
    }

    playTetris() {
        // Mega dramatic sweeping neon double blast
        if (!this.isEnabled || this.muted) return;
        this.init();
        
        const now = this.ctx.currentTime;
        
        // Synthesize an epic power chord sweep
        const baseFreqs = [196, 261, 329, 392]; // G3, C4, E4, G4 chord
        
        baseFreqs.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            // Sawtooth sweep + Square sweep combined
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + (index * 0.02));
            osc.frequency.exponentialRampToValueAtTime(freq * 2.5, now + 0.5);
            
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(freq, now + (index * 0.02));
            osc2.frequency.exponentialRampToValueAtTime(freq * 2.5, now + 0.5);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.sfxVolume);
            
            osc.start();
            osc.stop(now + 0.55);
            osc2.start();
            osc2.stop(now + 0.55);
        });
    }

    playLevelUp() {
        // High-pitched synth flourish ascending quickly
        if (!this.isEnabled || this.muted) return;
        this.init();
        
        const notes = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'E6', 'G6'];
        const frequencies = [523, 587, 659, 784, 880, 1046, 1318, 1568];
        
        frequencies.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.2, 0.35);
            }, idx * 45);
        });
    }

    playGameOver() {
        // Melancholy descending synth chord fading out
        if (!this.isEnabled || this.muted) return;
        this.init();
        
        this.stopBGM();
        
        const baseFreqs = [220, 165, 110]; // A3, E3, A2
        const now = this.ctx.currentTime;
        
        baseFreqs.forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.4, now + 1.2);
            
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            
            osc.connect(gain);
            gain.connect(this.sfxVolume);
            
            osc.start();
            osc.stop(now + 1.3);
        });
    }

    /* --------------------------------------------------------------------------
       BGM Sequencer & Looping
       -------------------------------------------------------------------------- */
    startBGM() {
        this.init();
        if (this.isPlayingBGM || this.muted) return;
        
        this.isPlayingBGM = true;
        this.currentNoteIndex = 0;
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        this.playBGMStep();
    }

    stopBGM() {
        this.isPlayingBGM = false;
        if (this.bgmInterval) {
            clearTimeout(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    /**
     * Recalculates BGM tempo based on game level to increase pressure
     */
    updateTempoForLevel(level) {
        // Base 150 BPM, increase by 6 BPM per level up to max 220 BPM
        this.tempo = Math.min(150 + (level - 1) * 6, 220);
    }

    playBGMStep() {
        if (!this.isPlayingBGM || this.muted || !this.isEnabled) return;

        const currentMelodyNote = this.melody[this.currentNoteIndex];
        const noteName = currentMelodyNote[0];
        const octave = currentMelodyNote[1];
        const durationBeats = currentMelodyNote[2];

        // Beats length to time in milliseconds
        // (60 seconds / BPM) * duration in beats * 1000 to convert to ms
        const beatDurationMs = (60 / this.tempo) * 1000;
        const totalDurationMs = beatDurationMs * durationBeats;

        // 1. Play melody note (Triangle wave - soft chip sound)
        if (noteName !== 'REST') {
            const freq = this.getFrequency(noteName, octave);
            this.playBGMNote(freq, 'triangle', totalDurationMs / 1000 - 0.02, 0.15);
        }

        // 2. Play bassline accompaniment in sync (Square wave - deeper bass pulse)
        // Bassline loops at its own cadence (we match the melody index progression)
        const bassIndex = Math.floor(this.currentNoteIndex / 1.25) % this.bassline.length;
        const bassNote = this.bassline[bassIndex];
        if (bassNote && this.currentNoteIndex % 2 === 0) {
            const bassFreq = this.getFrequency(bassNote[0], bassNote[1]);
            // Play bass notes on beats
            this.playBGMNote(bassFreq, 'square', 0.12, 0.08);
        }

        // Increment pointer
        this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melody.length;

        // Schedule next beat
        this.bgmInterval = setTimeout(() => {
            this.playBGMStep();
        }, totalDurationMs);
    }

    /**
     * BGM specific sound generator to prevent routing overlaps
     */
    playBGMNote(freq, type, duration, volume) {
        if (freq === 0 || !this.isEnabled || this.muted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.bgmVolume);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
}

// Global Single Instance
const audio = new SoundEngine();
