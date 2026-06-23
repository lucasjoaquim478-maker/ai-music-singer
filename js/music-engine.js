const MusicEngine = {
  ctx: null,
  masterGain: null,
  recordDest: null,
  mediaRecorder: null,
  recordedChunks: [],
  isPlaying: false,
  isRecording: false,
  volume: 0.7,
  timerId: null,
  step: 0,
  steps: 16,
  stepsPerBeat: 4,
  beat: 0,
  measure: 0,

  analysis: null,
  bpm: 116,
  scale: 'major',
  intensity: 0.5,
  chords: ['C','F','G','Am'],
  currentSection: 'intro',

  progressions: {
    major_happy:  ['C','Am','F','G'],
    major_calm:   ['C','G','Am','F'],
    major_energetic: ['E','A','D','G'],
    major_party:  ['C','F','G','C'],
    major_love:   ['C','G','Am','F'],
    minor_sad:    ['Am','Dm','Em','Am'],
    minor_calm:   ['Am','F','C','G'],
    minor_night:  ['Dm','Gm','C','F'],
    minor_spiritual: ['Am','F','G','Em'],
    minor_energetic: ['F#m','D','A','E'],
    neutral:      ['C','F','G','C'],
  },

  noteFreqs: {
    'C':261.63,'C#':277.18,'D':293.66,'D#':311.13,'E':329.63,
    'F':349.23,'F#':369.99,'G':392.00,'G#':415.30,'A':440.00,
    'A#':466.16,'B':493.88,
  },

  chordTypes: {
    'major':  [0,4,7], 'minor':  [0,3,7],
    'maj7':   [0,4,7,11], 'm7': [0,3,7,10],
    '7':      [0,4,7,10], 'dim': [0,3,6],
    'm7dim5': [0,3,6,10],
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
    const intervals = this.chordTypes[type] || [0,4,7];
    return intervals.map(interval =>
      this.getFreq(root, interval + (octave - 3) * 12)
    );
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
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  loadAnalysis(analysis) {
    this.analysis = analysis;
    this.bpm = analysis.bpm;
    this.scale = analysis.scale;
    this.intensity = analysis.intensity;

    const mood = analysis.mood;
    const theme = analysis.theme === 'other' ? null : analysis.theme;
    const key = theme ? `${this.scale}_${theme}` : `${this.scale}_${mood}`;

    this.chords = this.progressions[key] || this.progressions[`${this.scale}_${mood}`] || this.progressions.neutral;
  },

  start(style, analysis) {
    this.init();
    this.ensureRunning();

    if (analysis) this.loadAnalysis(analysis);
    else this.chords = ['C','F','G','Am'];

    this.isPlaying = true;
    this.step = 0;
    this.beat = 0;
    this.measure = 0;
    this.currentSection = 'intro';

    if (this.timerId) { clearTimeout(this.timerId); this.timerId = null; }

    this.startRecording();
    this.scheduleNext();
  },

  stop() {
    this.isPlaying = false;
    if (this.timerId) { clearTimeout(this.timerId); this.timerId = null; }
  },

  scheduleNext() {
    if (!this.isPlaying) return;
    const stepMs = 60000 / (this.bpm * this.stepsPerBeat);

    this.timerId = setTimeout(() => {
      if (!this.isPlaying) return;
      this.updateSection();
      this.playStep(this.step);
      this.step = (this.step + 1) % this.steps;
      if (this.step === 0) {
        this.beat = (this.beat + 1) % 4;
        if (this.beat === 0) this.measure++;
      }
      this.scheduleNext();
    }, stepMs);
  },

  updateSection() {
    const m = this.measure;
    const intensity = this.intensity;

    if (m < 4) this.currentSection = 'intro';
    else if (m < 12) this.currentSection = 'verse';
    else if (m < 16) this.currentSection = 'chorus';
    else if (m < 24) this.currentSection = 'verse';
    else if (m < 28) this.currentSection = 'chorus';
    else if (m < 32) this.currentSection = 'bridge';
    else if (m < 36) this.currentSection = 'chorus';
    else this.currentSection = 'outro';
  },

  sectionMultiplier() {
    switch (this.currentSection) {
      case 'intro': return 0.4;
      case 'verse': return 0.7;
      case 'chorus': return 1.0;
      case 'bridge': return 0.5;
      case 'outro': return 0.3;
      default: return 0.7;
    }
  },

  patternsForSection() {
    const s = this.currentSection;
    const i = this.intensity;

    if (s === 'intro') {
      return {
        kick: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
        snare:[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        hat:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        bass: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        melody: false,
        chordIntensity: 0.3,
      };
    }

    if (s === 'verse') {
      const f = i > 0.6 ? 0.8 : 0.6;
      return {
        kick: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0].map(x => x * f),
        snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(x => x * f),
        hat:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0].map(x => x * f),
        bass: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        melody: i > 0.5,
        chordIntensity: 0.5,
      };
    }

    if (s === 'chorus') {
      return {
        kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
        bass: [0,0,0,0, 0,0,0,0, 2,0,0,0, 0,0,0,0],
        melody: true,
        chordIntensity: 1.0,
      };
    }

    if (s === 'bridge') {
      return {
        kick: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        snare:[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        hat:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        bass: [0,0,0,0, -5,0,0,0, 0,0,0,0, -3,0,0,0],
        melody: true,
        chordIntensity: 0.6,
      };
    }

    if (s === 'outro') {
      return {
        kick: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        snare:[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        hat:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        bass: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        melody: false,
        chordIntensity: 0.2,
      };
    }

    return {
      kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      bass: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      melody: true,
      chordIntensity: 0.8,
    };
  },

  playStep(step) {
    try {
      const pat = this.patternsForSection();
      const mul = this.sectionMultiplier();
      const t = this.ctx.currentTime + 0.01;

      const chordIdx = Math.floor(this.measure / 2) % this.chords.length;
      const chordName = this.chords[chordIdx];
      const { root } = this.parseChord(chordName);

      if (pat.kick[step]) this.playKick(t, mul);
      if (pat.snare[step]) this.playSnare(t, mul);
      if (pat.hat[step]) this.playHat(t, mul);
      if (pat.bass[step] !== undefined) this.playBass(t, root, pat.bass[step], mul);
      if (step % 4 === 0) this.playChord(t, chordName, pat.chordIntensity * mul);
      if (pat.melody && step % 8 === 0) this.playMelodyNote(t, chordName, mul);
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

  playKick(t, mul) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    gain.gain.setValueAtTime(1.0 * mul, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.15);
  },

  playSnare(t, mul) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.15);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 260;
    filter.Q.value = 1.0;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45 * mul, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.connect(filter).connect(gain).connect(this.masterGain);
    noise.start(t); noise.stop(t + 0.15);
  },

  playHat(t, mul) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.04);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15 * mul, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    noise.connect(filter).connect(gain).connect(this.masterGain);
    noise.start(t); noise.stop(t + 0.04);
  },

  playBass(t, root, semitones, mul) {
    const freq = this.getFreq(root, -12 + (semitones || 0));
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3 * mul, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.18);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    osc.connect(filter).connect(gain).connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.2);
  },

  playChord(t, name, mul) {
    if (mul < 0.01) return;
    const freqs = this.getChordFreqs(name);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12 * mul, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 1.0);

    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * (i === 0 ? 1 : 2);
      const oGain = this.ctx.createGain();
      oGain.gain.value = i === 0 ? 0.6 : 0.3;
      osc.connect(oGain).connect(gain);
      osc.start(t); osc.stop(t + 1.0);
    });
    gain.connect(this.masterGain);
  },

  melodyStep: 0,
  melodyDirection: 1,

  playMelodyNote(t, name, mul) {
    if (mul < 0.1) return;
    const freqs = this.getChordFreqs(name);
    if (freqs.length === 0) return;

    const noteIdx = this.melodyStep % freqs.length;
    const baseFreq = freqs[noteIdx];

    const octaves = [1, 2, 2, 1.5, 2, 2.5, 1];
    const octave = octaves[this.melodyStep % octaves.length];

    const freq = baseFreq * octave;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const dur = 0.3 + (this.melodyStep % 3) * 0.1;
    gain.gain.setValueAtTime(0.15 * mul, t);
    gain.gain.linearRampToValueAtTime(0.001, t + dur);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000 + (this.melodyStep % 4) * 500;

    osc.connect(filter).connect(gain).connect(this.masterGain);
    osc.start(t); osc.stop(t + dur);
    this.melodyStep = (this.melodyStep + 1) % 16;
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
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      this.mediaRecorder = new MediaRecorder(this.recordDest.stream, { mimeType: mime });
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
        resolve(null); return;
      }
      this.isRecording = false;
      this.mediaRecorder.onstop = () => {
        if (this.recordedChunks.length === 0) { resolve(null); return; }
        resolve(new Blob(this.recordedChunks, { type: 'audio/webm' }));
      };
      if (this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
      else resolve(null);
    });
  },
};
