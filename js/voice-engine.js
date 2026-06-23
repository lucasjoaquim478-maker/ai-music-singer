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
    elevenlabs: { label: 'ElevenLabs', premium: true, desc: '🎯 Voz ultra-realista • Requer chave API' },
    openai: { label: 'OpenAI TTS', premium: true, desc: '🤖 Voz natural • Requer chave API' },
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
    const load = () => {
      this.nativeVoices = synth.getVoices();
    };
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
    try {
      localStorage.setItem('ai_singer_api_keys', JSON.stringify(this.apiKeys));
    } catch {}
  },

  setApiKey(provider, key) {
    this.apiKeys[provider] = key;
    this.saveApiKeys();
  },

  setProvider(name) {
    if (this.providers[name]) {
      this.currentProvider = name;
    }
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

    if (this.currentSource) {
      try { this.currentSource.stop(); } catch {}
      this.currentSource = null;
    }
  },

  pause() {
    this.isPaused = true;
    if (this.currentProvider === 'native') {
      window.speechSynthesis.pause();
    }
  },

  resume() {
    this.isPaused = false;
    if (this.currentProvider === 'native') {
      window.speechSynthesis.resume();
    }
  },

  async speak(lines, options) {
    if (lines.length === 0) return;

    this.isSpeaking = true;
    this.isPaused = false;
    this.utteranceQueue = [...lines];

    const provider = this.currentProvider;

    if (provider === 'elevenlabs') {
      await this.elevenlabsSpeak(lines, options);
    } else if (provider === 'openai') {
      await this.openaiSpeak(lines, options);
    } else {
      await this.nativeSpeak(lines, options);
    }
  },

  /* ===== NATIVE (Web Speech API) ===== */

  async nativeSpeak(lines, options) {
    const style = options.style || 'pop';
    const basePitch = options.pitch || 1.0;
    const rate = options.rate || 1.0;
    const volume = options.volume || 1.0;
    const voice = options.voice || null;

    for (let i = 0; i < lines.length; i++) {
      if (!this.isSpeaking || this.isPaused) break;

      const line = lines[i];
      const words = line.split(/\s+/);
      const isLast = i === lines.length - 1;

      await this.nativeSpeakLine(line, {
        basePitch, rate, volume, voice,
        words, wordCount: words.length,
        lineIndex: i, totalLines: lines.length,
        isLast,
      });
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
      const pitchRange = 0.3;
      const words = line.split(/\s+/);

      const fullText = words.join(' ');
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.lang = 'pt-BR';
      utterance.volume = volume;
      utterance.rate = Math.min(rate, 1.5);
      utterance.pitch = basePitch + (Math.sin(opts.lineIndex * 0.5) * 0.15);

      const neuralCandidates = ['Neural', 'Natural', 'Premium', 'Microsoft', 'Zira', 'Jenny', 'Online'];
      if (voice) {
        utterance.voice = voice;
      } else {
        const best = this.findBestVoice(neuralCandidates);
        if (best) utterance.voice = best;
      }

      utterance.onend = resolve;
      utterance.onerror = () => resolve();

      synth.speak(utterance);
    });
  },

  findBestVoice(priorityWords) {
    const voices = this.nativeVoices;
    if (voices.length === 0) return null;

    for (const word of priorityWords) {
      const found = voices.find(v =>
        v.lang.startsWith('pt') &&
        v.name.toLowerCase().includes(word.toLowerCase())
      );
      if (found) return found;
    }

    const ptVoice = voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) return ptVoice;

    return voices[0];
  },

  /* ===== ElevenLabs ===== */

  async elevenlabsSpeak(lines, options) {
    const apiKey = this.apiKeys.elevenlabs;
    if (!apiKey) {
      if (this.onError) this.onError('ElevenLabs: chave API não configurada');
      return;
    }

    const voiceId = '21m00Tcm4TlvDq8ikWAM';
    const model = 'eleven_multilingual_v2';
    const style = options.style || 'pop';
    const stability = 0.5;
    const similarity = 0.7;

    const styleBoost = {
      pop: 0.3, rock: 0.5, funk: 0.4, rap: 0.6,
      sertanejo: 0.2, eletronica: 0.3, gospel: 0.1,
    };

    const text = lines.join('. ');

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: model,
            voice_settings: {
              stability,
              similarity_boost: similarity,
              style: styleBoost[style] || 0.3,
              speaking_rate: 1.0,
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        if (this.onError) this.onError(`ElevenLabs: ${err}`);
        return;
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        this.isSpeaking = false;
        if (this.onFinish) this.onFinish();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (this.onError) this.onError('ElevenLabs: erro ao reproduzir áudio');
      };

      await audio.play();

      this.currentAudio = audio;
    } catch (e) {
      if (this.onError) this.onError(`ElevenLabs: ${e.message}`);
    }
  },

  /* ===== OpenAI TTS ===== */

  async openaiSpeak(lines, options) {
    const apiKey = this.apiKeys.openai;
    if (!apiKey) {
      if (this.onError) this.onError('OpenAI: chave API não configurada');
      return;
    }

    const style = options.style || 'pop';
    const voice = this.openaiVoiceForStyle(style);
    const text = lines.join('. ');

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: text,
          voice,
          response_format: 'mp3',
          speed: 1.0,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        if (this.onError) this.onError(`OpenAI: ${err}`);
        return;
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        this.isSpeaking = false;
        if (this.onFinish) this.onFinish();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (this.onError) this.onError('OpenAI: erro ao reproduzir áudio');
      };

      await audio.play();
      this.currentAudio = audio;
    } catch (e) {
      if (this.onError) this.onError(`OpenAI: ${e.message}`);
    }
  },

  openaiVoiceForStyle(style) {
    const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const styleMap = {
      pop: 'nova',
      rock: 'onyx',
      funk: 'fable',
      rap: 'echo',
      sertanejo: 'shimmer',
      eletronica: 'alloy',
      gospel: 'nova',
    };
    return styleMap[style] || 'alloy';
  },

  readVoices() {
    return this.nativeVoices;
  },
};
