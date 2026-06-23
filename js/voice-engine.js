const VoiceEngine = {
  currentProvider: 'native',
  apiKeys: { elevenlabs: '', openai: '' },
  isSpeaking: false,
  isPaused: false,
  audioContext: null,
  currentSource: null,
  utteranceQueue: [],
  onLineEnd: null,
  onFinish: null,
  onError: null,

  providers: {
    native: { label: 'Voz do Navegador', premium: false, desc: 'Gratuito • Qualidade padrão' },
    elevenlabs: { label: 'ElevenLabs', premium: true, desc: 'Voz ultra-realista • Requer chave API' },
    openai: { label: 'OpenAI TTS', premium: true, desc: 'Voz natural • Requer chave API' },
  },

  nativeVoices: [],

  init() {
    this.loadApiKeys();
    this.initAudioContext();
    this.loadNativeVoices();
  },

  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  },

  loadNativeVoices() {
    const synth = window.speechSynthesis;
    const load = () => { this.nativeVoices = synth.getVoices(); };
    load();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = load;
    }
  },

  loadApiKeys() {
    try {
      const saved = JSON.parse(localStorage.getItem('ai_singer_api_keys') || '{}');
      this.apiKeys.elevenlabs = saved.elevenlabs || '';
      this.apiKeys.openai = saved.openai || '';
    } catch {}
  },

  saveApiKeys() {
    try { localStorage.setItem('ai_singer_api_keys', JSON.stringify(this.apiKeys)); } catch {}
  },

  setApiKey(provider, key) {
    this.apiKeys[provider] = key.trim();
    this.saveApiKeys();
  },

  setProvider(name) {
    if (this.providers[name]) this.currentProvider = name;
  },

  isProviderAvailable(name) {
    if (name === 'native') return true;
    if (name === 'elevenlabs') return !!this.apiKeys.elevenlabs;
    if (name === 'openai') return !!this.apiKeys.openai;
    return false;
  },

  stop() {
    this.isSpeaking = false;
    this.isPaused = false;
    this.utteranceQueue = [];
    window.speechSynthesis.cancel();
    if (this.currentAudio) {
      try { this.currentAudio.pause(); this.currentAudio = null; } catch {}
    }
  },

  pause() {
    this.isPaused = true;
    if (this.currentProvider === 'native') window.speechSynthesis.pause();
  },

  resume() {
    this.isPaused = false;
    if (this.currentProvider === 'native') window.speechSynthesis.resume();
  },

  async speak(lines, options) {
    if (lines.length === 0) return;
    this.isSpeaking = true;
    this.isPaused = false;
    this.utteranceQueue = [...lines];
    const p = this.currentProvider;
    try {
      if (p === 'elevenlabs') await this.elevenlabsSpeak(lines, options);
      else if (p === 'openai') await this.openaiSpeak(lines, options);
      else await this.nativeSpeak(lines, options);
    } catch (e) {
      if (this.onError) this.onError(`Erro: ${e.message}`);
    }
  },

  /* ===== NATIVE (Web Speech API) ===== */

  async nativeSpeak(lines, options) {
    const basePitch = options.pitch || 1.0;
    const rate = options.rate || 1.0;
    const volume = options.volume || 1.0;
    const voice = options.voice || null;

    for (let i = 0; i < lines.length; i++) {
      if (!this.isSpeaking || this.isPaused) break;
      await this.nativeSpeakLine(lines[i], { basePitch, rate, volume, voice, lineIndex: i });
      if (this.onLineEnd) this.onLineEnd(i);
    }
    if (this.isSpeaking && !this.isPaused) {
      this.isSpeaking = false;
      if (this.onFinish) this.onFinish();
    }
  },

  nativeSpeakLine(line, opts) {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      const { basePitch, rate, volume, voice } = opts;
      const u = new SpeechSynthesisUtterance(line);
      u.lang = 'pt-BR';
      u.volume = volume;
      u.rate = Math.min(rate, 1.5);
      u.pitch = basePitch + (Math.sin(opts.lineIndex * 0.5) * 0.15);
      if (voice) u.voice = voice;
      else {
        const best = this.findBestVoice(['Neural', 'Natural', 'Premium', 'Microsoft', 'Zira', 'Jenny', 'Online']);
        if (best) u.voice = best;
      }
      u.onend = resolve;
      u.onerror = () => resolve();
      synth.speak(u);
    });
  },

  findBestVoice(priorityWords) {
    const voices = this.nativeVoices;
    if (voices.length === 0) return null;
    for (const word of priorityWords) {
      const found = voices.find(v => v.lang.startsWith('pt') && v.name.toLowerCase().includes(word.toLowerCase()));
      if (found) return found;
    }
    return voices.find(v => v.lang.startsWith('pt')) || voices[0];
  },

  /* ===== ElevenLabs ===== */

  async elevenlabsSpeak(lines, options) {
    const apiKey = this.apiKeys.elevenlabs;
    if (!apiKey) { if (this.onError) this.onError('ElevenLabs: chave API não configurada'); return; }

    const voiceId = '21m00Tcm4TlvDq8ikWAM';
    const text = lines.join('. ');

    console.log('ElevenLabs: enviando requisição...');

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.7, style: 0.3, speaking_rate: 1.0 },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error response:', response.status, err);
      if (this.onError) this.onError(`ElevenLabs (${response.status}): ${err.slice(0, 200)}`);
      return;
    }

    console.log('ElevenLabs: áudio recebido, reproduzindo...');
    const audioBlob = await response.blob();
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);

    audio.onended = () => {
      URL.revokeObjectURL(url);
      this.isSpeaking = false;
      if (this.onFinish) this.onFinish();
    };
    audio.onerror = (e) => {
      console.error('ElevenLabs audio playback error:', e);
      URL.revokeObjectURL(url);
      if (this.onError) this.onError('ElevenLabs: erro ao reproduzir áudio');
    };

    await audio.play();
    this.currentAudio = audio;
  },

  /* ===== OpenAI TTS ===== */

  async openaiSpeak(lines, options) {
    const apiKey = this.apiKeys.openai;
    if (!apiKey) { if (this.onError) this.onError('OpenAI: chave API não configurada'); return; }

    const voice = this.openaiVoiceForStyle(options.style || 'pop');
    const text = lines.join('. ');

    console.log('OpenAI: enviando requisição...');

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        response_format: 'mp3',
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error response:', response.status, err);
      if (this.onError) this.onError(`OpenAI (${response.status}): ${err.slice(0, 200)}`);
      return;
    }

    console.log('OpenAI: áudio recebido, reproduzindo...');
    const audioBlob = await response.blob();
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);

    audio.onended = () => {
      URL.revokeObjectURL(url);
      this.isSpeaking = false;
      if (this.onFinish) this.onFinish();
    };
    audio.onerror = (e) => {
      console.error('OpenAI audio playback error:', e);
      URL.revokeObjectURL(url);
      if (this.onError) this.onError('OpenAI: erro ao reproduzir áudio');
    };

    await audio.play();
    this.currentAudio = audio;
  },

  openaiVoiceForStyle(style) {
    const m = { pop: 'nova', rock: 'onyx', funk: 'fable', rap: 'echo', sertanejo: 'shimmer', eletronica: 'alloy', gospel: 'nova' };
    return m[style] || 'alloy';
  },

  readVoices() { return this.nativeVoices; },
};
