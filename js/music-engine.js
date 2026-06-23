const MusicEngine = {
  ctx: null,
  masterGain: null,
  recordDest: null,
  mediaRecorder: null,
  recordedChunks: [],
  isPlaying: false,
  isRecording: false,
  volume: 0.7,
  style: 'pop',
  timerId: null,
  step: 0,
  stepsPerBeat: 4,
  beatIndex: 0,

  styles: {
    pop: {
      bpm: 116, scale: 'major',
      chords: ['C','F','G','Am'],
      kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      bass: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    },
    rock: {
      bpm: 136, scale: 'major',
      chords: ['E','A','D','G'],
      kick: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      bass: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    },
    funk: {
      bpm: 108, scale: 'dorian',
      chords: ['Dm7','G7','Cmaj7','Am7'],
      kick: [1,0,1,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:  [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1],
      bass: [0,0,0,0, 2,0,0,0, 0,0,0,0, -1,0,0,0],
    },
    rap: {
      bpm: 92, scale: 'minor',
      chords: ['Am','F','G','Em'],
      kick: [1,0,0,0, 1,0,0,0, 0,0,1,0, 0,0,0,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      bass: [0,0,0,0, 0,0,0,0, 2,0,0,0, 0,0,0,0],
    },
    sertanejo: {
      bpm: 76, scale: 'major',
      chords: ['G','C','D','Em'],
      kick: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      bass: [0,0,0,0, 0,0,0,0, 0,0,0,0, -5,0,0,0],
    },
    eletronica: {
      bpm: 124, scale: 'minor',
      chords: ['F#m','A','B','D'],
      kick: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:  [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      bass: [0,0,0,0, 0,0,0,0, 7,0,0,0, 0,0,0,0],
    },
    gospel: {
      bpm: 68, scale: 'major',
      chords: ['C','F','G','Am'],
      kick: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      snare:[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      hat:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      bass: [0,0,0,0, -3,0,0,0, 0,0,0,0, -7,0,0,0],
    },
  },

  noteFreqs: {
    'C':261.63,'C#':277.18,'D':293.66,'D#':311.13,'E':329.63,
    'F':349.23,'F#':369.99,'G':392.00,'G#':415.30,'A':440.00,
    'A#':466.16,'B':493.88,
  },

  chordTypes: {
    'major':  [0, 4, 7],
    'minor':  [0, 3, 7],
    'maj7':   [0, 4, 7, 11],
    'm7':     [0, 3, 7, 10],
    '7':      [0, 4, 7, 10],
    'dim':    [0, 3, 6],
    'm7dim5': [0, 3, 6, 10],
  },

  parseChord(name) {
    const m = name.match(/^([A-G][#b]?)(maj|m|dim|7|maj7|m7|m7dim5|aug)?/);
    if (!m) return { root: 'C', type: 'major', octave: 3 };
    const root = m[1];
    let type = m[2] || (name.includes('m') ? 'minor' : 'major');
    if (!this.chordTypes[type]) type = 'major';
    return { root, type, octave: 3 };
  },

  getFreq(root, semitones) {
    const base = this.noteFreqs[root] || 261.63;
    return base * Math.pow(2, semitones / 12);
  },

  getChordFreqs(name) {
    const { root, type, octave } = this.parseChord(name);
    const intervals = this.chordTypes[type] || [0, 4, 7];
    return intervals.map(interval => {
      const f = this.getFreq(root, interval + (octave - 3) * 12);
      return f;
    });
  },

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);
    this.recordDest = this.ctx.createMediaStreamDestination();
    this.masterGain.connect(this.recordDest);
  },

  ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  start(style) {
    this.init();
    this.ensureRunning();
    this.style = style || this.style;
    this.isPlaying = true;
    this.step = 0;
    this.beatIndex = 0;

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.startRecording();
    this.scheduleNext();
  },

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  },

  scheduleNext() {
    if (!this.isPlaying) return;
    const cfg = this.styles[this.style];
    const stepMs = 60000 / (cfg.bpm * this.stepsPerBeat);

    this.timerId = setTimeout(() => {
      if (!this.isPlaying) return;
      this.playStep(this.step);
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.beatIndex = (this.beatIndex + 1) % 4;
      this.scheduleNext();
    }, stepMs);
  },

  playStep(step) {
    try {
      const cfg = this.styles[this.style];
      const t = this.ctx.currentTime + 0.01;

      if (cfg.kick[step]) this.playKick(t);
      if (cfg.snare[step]) this.playSnare(t);
      if (cfg.hat[step]) this.playHat(t);
      if (cfg.bass[step] !== 0 && cfg.bass[step] !== undefined) this.playBass(t, cfg, step);
      if (step % 4 === 0) this.playChord(t, cfg, step);
    } catch (e) {
      console.error('MusicEngine step error:', e);
    }
  },

  createNoiseBuffer(duration) {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  },

  playKick(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  },

  playSnare(t) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.15);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 260;
    filter.Q.value = 1.0;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.connect(filter).connect(gain).connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.15);
  },

  playHat(t) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.04);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    noise.connect(filter).connect(gain).connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.04);
  },

  playBass(t, cfg, step) {
    const chordIdx = Math.floor((this.beatIndex * 4 + Math.floor(step / 4)) / 4) % cfg.chords.length;
    const chordName = cfg.chords[chordIdx];
    const { root } = this.parseChord(chordName);
    const semitones = cfg.bass[step] || 0;
    const freq = this.getFreq(root, -12 + semitones);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.18);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    osc.connect(filter).connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  },

  playChord(t, cfg, step) {
    const chordIdx = Math.floor((this.beatIndex * 4 + Math.floor(step / 4)) / 4) % cfg.chords.length;
    const chordName = cfg.chords[chordIdx];
    const freqs = this.getChordFreqs(chordName);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.9);

    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * (i === 0 ? 1 : 2);
      const oGain = this.ctx.createGain();
      oGain.gain.value = i === 0 ? 0.6 : 0.3;
      osc.connect(oGain).connect(gain);
      osc.start(t);
      osc.stop(t + 0.9);
    });

    gain.connect(this.masterGain);
  },

  setVolume(val) {
    this.volume = val;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  },

  startRecording() {
    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(this.recordDest.stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (e) {
      console.warn('MediaRecorder not available:', e);
    }
  },

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }
      this.isRecording = false;
      this.mediaRecorder.onstop = () => {
        if (this.recordedChunks.length === 0) { resolve(null); return; }
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        resolve(blob);
      };
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      } else {
        resolve(null);
      }
    });
  },
};
