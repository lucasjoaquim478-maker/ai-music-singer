const App = {
  state: {
    currentLine: 0,
    totalLines: 0,
    isPlaying: false,
    isPaused: false,
    isGenerating: false,
    recordedBlob: null,
    musicEnabled: true,
  },

  elements: {},

  styleConfigs: {
    pop:     { pitch: 1.0, rate: 1.0, desc: 'Andamento médio • Voz suave', emoji: '🎤' },
    rock:    { pitch: 0.8, rate: 1.2, desc: 'Andamento acelerado • Voz rouca', emoji: '🎸' },
    funk:    { pitch: 1.1, rate: 1.3, desc: 'Batida pesada • Voz marcada', emoji: '🕺' },
    rap:     { pitch: 0.7, rate: 1.5, desc: 'Fala ritmada • Flow rápido', emoji: '🎙️' },
    sertanejo: { pitch: 0.9, rate: 0.9, desc: 'Voz emocionada • Andamento lento', emoji: '🌄' },
    eletronica: { pitch: 1.3, rate: 1.4, desc: 'Voz robótica • Batida sintética', emoji: '🎛️' },
    gospel:  { pitch: 1.0, rate: 0.8, desc: 'Voz imponente • Andamento lento', emoji: '🙌' },
  },

  init() {
    VoiceEngine.init();
    this.cacheElements();
    this.bindEvents();
    this.loadVoices();
    this.loadHistory();
    this.updateCharCount();
    this.loadVoiceProviderConfig();
  },

  cacheElements() {
    const $ = (id) => document.getElementById(id);
    this.elements = {
      lyrics: $('lyrics'),
      styleSelect: $('styleSelect'),
      voiceSelect: $('voiceSelect'),
      speedRange: $('speedRange'),
      speedValue: $('speedValue'),
      volumeRange: $('volumeRange'),
      volumeValue: $('volumeValue'),
      charCount: $('charCount'),
      btnGerar: $('btnGerar'),
      btnParar: $('btnParar'),
      btnPausar: $('btnPausar'),
      pauseIcon: $('pauseIcon'),
      pauseText: $('pauseText'),
      btnSalvar: $('btnSalvar'),
      btnExportar: $('btnExportar'),
      btnLimpar: $('btnLimpar'),
      btnLimparHistorico: $('btnLimparHistorico'),
      statusText: $('statusText'),
      statusIndicator: $('statusIndicator'),
      currentLine: $('currentLine'),
      progressContainer: $('progressContainer'),
      progressFill: $('progressFill'),
      progressLine: $('progressLine'),
      progressTime: $('progressTime'),
      historyList: $('historyList'),
      historySection: $('historySection'),
      previewLabel: $('previewLabel'),
      toast: $('toast'),
      musicToggle: $('musicToggle'),
      musicVolume: $('musicVolume'),
      musicVolumeValue: $('musicVolumeValue'),
      btnDownload: $('btnDownload'),
      aiAnalysis: $('aiAnalysis'),
      aiSummary: $('aiSummary'),
      aiTags: $('aiTags'),
      aiBpm: $('aiBpm'),
      aiScale: $('aiScale'),
      aiIntensity: $('aiIntensity'),
      aiSections: $('aiSections'),
      voiceProvider: $('voiceProvider'),
      nativeVoiceGroup: $('nativeVoiceGroup'),
      elevenlabsConfig: $('elevenlabsConfig'),
      elevenlabsKey: $('elevenlabsKey'),
      openaiConfig: $('openaiConfig'),
      openaiKey: $('openaiKey'),
      btnTestElevenlabs: $('btnTestElevenlabs'),
      btnTestOpenai: $('btnTestOpenai'),
    };
  },

  bindEvents() {
    const el = this.elements;

    el.lyrics.addEventListener('input', () => this.updateCharCount());
    el.speedRange.addEventListener('input', () => {
      el.speedValue.textContent = parseFloat(el.speedRange.value).toFixed(1) + 'x';
    });
    el.volumeRange.addEventListener('input', () => {
      el.volumeValue.textContent = parseInt(el.volumeRange.value) + '%';
    });
    el.styleSelect.addEventListener('change', () => {
      this.updateStylePreview();
      localStorage.setItem('ai_singer_style', el.styleSelect.value);
    });
    el.voiceSelect.addEventListener('change', () => {
      localStorage.setItem('ai_singer_voice_idx', el.voiceSelect.value);
    });

    el.btnGerar.addEventListener('click', () => this.generate());
    el.btnParar.addEventListener('click', () => this.stop());
    el.btnPausar.addEventListener('click', () => this.togglePause());
    el.btnSalvar.addEventListener('click', () => this.saveLyrics());
    el.btnExportar.addEventListener('click', () => this.exportTxt());
    el.btnLimpar.addEventListener('click', () => this.clearLyrics());
    el.btnLimparHistorico.addEventListener('click', () => this.clearHistory());
    el.btnDownload.addEventListener('click', () => this.downloadAudio());

    el.musicVolume.addEventListener('input', () => {
      const val = parseInt(el.musicVolume.value);
      el.musicVolumeValue.textContent = val + '%';
      MusicEngine.setVolume(val / 100);
    });
    el.musicToggle.addEventListener('change', () => {
      this.state.musicEnabled = el.musicToggle.checked;
    });

    el.voiceProvider.addEventListener('change', () => this.onVoiceProviderChange());
    el.elevenlabsKey.addEventListener('change', () => {
      VoiceEngine.setApiKey('elevenlabs', el.elevenlabsKey.value);
    });
    el.openaiKey.addEventListener('change', () => {
      VoiceEngine.setApiKey('openai', el.openaiKey.value);
    });
    el.btnTestElevenlabs.addEventListener('click', () => this.testProvider('elevenlabs'));
    el.btnTestOpenai.addEventListener('click', () => this.testProvider('openai'));

    VoiceEngine.onFinish = () => {
      if (this.state.isPlaying && !this.state.isPaused) {
        this.finish();
      }
    };

    VoiceEngine.onError = (msg) => {
      this.showToast(msg, 'error');
    };

    window.addEventListener('beforeunload', () => this.stop());
  },

  loadVoices() {
    const el = this.elements;
    const update = () => {
      const voices = VoiceEngine.readVoices();
      el.voiceSelect.innerHTML = '';
      voices.forEach((v, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        const isNeural = v.name.toLowerCase().includes('neural') || v.name.toLowerCase().includes('natural');
        opt.textContent = `${v.name} (${v.lang})${isNeural ? ' 🧠' : ''}`;
        el.voiceSelect.appendChild(opt);
      });
      if (voices.length === 0) {
        el.voiceSelect.innerHTML = '<option value="">Nenhuma voz disponível</option>';
      }
      el.voiceSelect.value = localStorage.getItem('ai_singer_voice_idx') || '0';
    };

    VoiceEngine.loadNativeVoices();
    setTimeout(update, 500);
    setTimeout(update, 1500);
  },

  updateStylePreview() {
    const style = this.elements.styleSelect.value;
    const cfg = this.styleConfigs[style];
    this.elements.previewLabel.textContent = `${cfg.emoji} ${style.charAt(0).toUpperCase() + style.slice(1)} • ${cfg.desc}`;
  },

  showAnalysis(analysis) {
    const el = this.elements;
    el.aiAnalysis.style.display = 'block';
    el.aiSummary.textContent = analysis.summary;
    el.aiBpm.textContent = analysis.bpm + ' BPM';
    el.aiScale.textContent = analysis.scale === 'major' ? 'Maior ☀️' : 'Menor 🌙';
    el.aiIntensity.textContent = this.intensityLabel(analysis.intensity);

    const sectionNames = {
      intro: '🎬 Intro', verse: '📖 Verso', chorus: '🎤 Refrão',
      bridge: '🌉 Ponte', outro: '🏁 Final',
    };
    el.aiSections.textContent = analysis.sections.length > 0
      ? analysis.sections.map(s => sectionNames[s] || s).join(', ')
      : 'Detecção automática';

    const tags = [analysis.mood, analysis.theme, analysis.scale === 'major' ? 'Tom maior' : 'Tom menor'];
    el.aiTags.innerHTML = tags
      .filter(t => t !== 'neutral' && t !== 'other')
      .map(t => `<span class="ai-tag">${t}</span>`)
      .join('');
  },

  intensityLabel(val) {
    if (val > 0.7) return '🔥 Intenso';
    if (val > 0.4) return '📊 Médio';
    return '🌊 Suave';
  },

  updateCharCount() {
    this.elements.charCount.textContent = this.elements.lyrics.value.length;
  },

  getLines() {
    return this.elements.lyrics.value.split('\n').filter(l => l.trim().length > 0);
  },

  generate() {
    const lines = this.getLines();
    if (lines.length === 0) {
      this.showToast('Digite uma letra primeiro!', 'error');
      return;
    }

    if (this.state.isGenerating) return;

    this.state.isGenerating = true;
    this.state.totalLines = lines.length;
    this.state.currentLine = 0;
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.state.recordedBlob = null;

    const lyrics = this.elements.lyrics.value;
    const analysis = LyricsAnalyzer.analyze(lyrics);
    this.showAnalysis(analysis);

    this.setStatus('Gerando música...', 'generating');
    this.elements.btnGerar.disabled = true;
    this.elements.btnParar.disabled = false;
    this.elements.btnPausar.disabled = false;
    this.elements.btnDownload.disabled = true;
    this.elements.pauseText.textContent = 'Pausar';
    this.elements.pauseIcon.textContent = '⏸';
    this.elements.progressContainer.style.display = 'block';
    this.elements.currentLine.textContent = '🎵 Iniciando...';
    this.updateProgress(0, 0);

    if (this.state.musicEnabled) {
      const style = this.elements.styleSelect.value;
      MusicEngine.setVolume(parseInt(this.elements.musicVolume.value) / 100);
      MusicEngine.start(style, analysis);
    }

    this.playLine(0);
  },

  playLine(startIndex) {
    if (!this.state.isPlaying) return;

    const allLines = this.getLines();
    const remainingLines = allLines.slice(startIndex);
    if (remainingLines.length === 0) { this.finish(); return; }

    this.state.currentLine = startIndex;
    const style = this.elements.styleSelect.value;
    const cfg = this.styleConfigs[style];
    const voiceIdx = parseInt(this.elements.voiceSelect.value);
    const speed = parseFloat(this.elements.speedRange.value);
    const volume = parseInt(this.elements.volumeRange.value) / 100;

    this.elements.currentLine.textContent = remainingLines[0];
    this.updateProgress(startIndex + 1, allLines.length);
    MusicEngine.ensureRunning();

    const voice = VoiceEngine.nativeVoices[voiceIdx] || null;

    VoiceEngine.onLineEnd = (lineIdx) => {
      if (!this.state.isPlaying) return;
      const globalIdx = startIndex + lineIdx;
      this.state.currentLine = globalIdx;
      if (allLines[globalIdx]) {
        this.elements.currentLine.textContent = allLines[globalIdx];
      }
      this.updateProgress(globalIdx + 1, allLines.length);
      this.setStatus(`Cantando: linha ${globalIdx + 1} de ${allLines.length}`, 'playing');
    };

    VoiceEngine.onFinish = () => {
      if (this.state.isPlaying) this.finish();
    };

    VoiceEngine.onError = (msg) => {
      this.showToast(msg, 'error');
      this.stop();
    };

    VoiceEngine.speak(remainingLines, {
      style,
      pitch: cfg.pitch,
      rate: speed * cfg.rate,
      volume,
      voice,
    });
  },

  async stop() {
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.isGenerating = false;
    this.state.currentLine = 0;

    VoiceEngine.stop();
    MusicEngine.stop();

    if (MusicEngine.isRecording) {
      const blob = await MusicEngine.stopRecording();
      if (blob) {
        this.state.recordedBlob = blob;
        this.elements.btnDownload.disabled = false;
      }
    }

    this.elements.btnGerar.disabled = false;
    this.elements.btnParar.disabled = true;
    this.elements.btnPausar.disabled = true;
    this.elements.pauseText.textContent = 'Pausar';
    this.elements.pauseIcon.textContent = '⏸';
    this.elements.currentLine.textContent = '—';
    this.elements.progressContainer.style.display = 'none';
    this.elements.progressFill.style.width = '0%';
    this.setStatus('Pronto para criar', 'idle');
  },

  togglePause() {
    if (!this.state.isPlaying) return;

    if (this.state.isPaused) {
      this.state.isPaused = false;
      this.elements.pauseText.textContent = 'Pausar';
      this.elements.pauseIcon.textContent = '⏸';
      this.setStatus(`Cantando: linha ${this.state.currentLine + 1} de ${this.state.totalLines}`, 'playing');
      if (MusicEngine.ctx && MusicEngine.ctx.state === 'suspended') {
        MusicEngine.ctx.resume();
      }
      VoiceEngine.resume();
      if (VoiceEngine.currentProvider === 'native') {
        this.playLine(this.state.currentLine);
      }
    } else {
      this.state.isPaused = true;
      this.elements.pauseText.textContent = 'Continuar';
      this.elements.pauseIcon.textContent = '▶';
      this.setStatus('Pausado', 'paused');
      VoiceEngine.pause();
      if (MusicEngine.ctx) {
        MusicEngine.ctx.suspend();
      }
    }
  },

  async finish() {
    if (!this.state.isPlaying) return;
    this.state.isPlaying = false;
    this.state.isGenerating = false;

    MusicEngine.stop();
    if (MusicEngine.isRecording) {
      const blob = await MusicEngine.stopRecording();
      if (blob) {
        this.state.recordedBlob = blob;
        this.elements.btnDownload.disabled = false;
      }
    }

    this.elements.btnGerar.disabled = false;
    this.elements.btnParar.disabled = true;
    this.elements.btnPausar.disabled = true;

    this.setStatus('Música finalizada! 🎉', 'idle');
    this.showToast('Música reproduzida com sucesso!', 'success');

    this.addHistory();
  },

  updateProgress(current, total) {
    this.elements.progressLine.textContent = `Linha ${current} / ${total}`;
    const pct = total > 0 ? (current / total) * 100 : 0;
    this.elements.progressFill.style.width = Math.min(pct, 100) + '%';
    const elapsed = Math.round((current / total) * 30);
    const totalSec = 30;
    this.elements.progressTime.textContent = `${this.formatTime(elapsed)} / ${this.formatTime(totalSec)}`;
  },

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  setStatus(text, type) {
    this.elements.statusText.textContent = text;
    this.elements.statusIndicator.className = 'status-indicator ' + type;
  },

  saveLyrics() {
    const text = this.elements.lyrics.value.trim();
    if (!text) { this.showToast('Nada para salvar', 'error'); return; }
    try {
      localStorage.setItem('ai_singer_lyrics', text);
      this.showToast('Letra salva!', 'success');
    } catch {
      this.showToast('Erro ao salvar', 'error');
    }
  },

  loadSavedLyrics() {
    try {
      const saved = localStorage.getItem('ai_singer_lyrics');
      if (saved) {
        this.elements.lyrics.value = saved;
        this.updateCharCount();
      }
      const lastStyle = localStorage.getItem('ai_singer_style');
      if (lastStyle && this.styleConfigs[lastStyle]) {
        this.elements.styleSelect.value = lastStyle;
        this.updateStylePreview();
      }
    } catch {}
  },

  loadVoiceProviderConfig() {
    const el = this.elements;
    const saved = localStorage.getItem('ai_singer_voice_provider');
    if (saved) {
      el.voiceProvider.value = saved;
    }
    VoiceEngine.loadApiKeys();
    el.elevenlabsKey.value = VoiceEngine.apiKeys.elevenlabs || '';
    el.openaiKey.value = VoiceEngine.apiKeys.openai || '';
    this.onVoiceProviderChange();
  },

  onVoiceProviderChange() {
    const provider = this.elements.voiceProvider.value;
    localStorage.setItem('ai_singer_voice_provider', provider);
    VoiceEngine.setProvider(provider);

    this.elements.nativeVoiceGroup.style.display = provider === 'native' ? 'flex' : 'none';
    this.elements.elevenlabsConfig.style.display = provider === 'elevenlabs' ? 'flex' : 'none';
    this.elements.openaiConfig.style.display = provider === 'openai' ? 'flex' : 'none';
  },

  async testProvider(provider) {
    const key = provider === 'elevenlabs'
      ? this.elements.elevenlabsKey.value.trim()
      : this.elements.openaiKey.value.trim();

    if (!key) {
      this.showToast(`Configure a API key do ${provider} primeiro`, 'error');
      return;
    }

    VoiceEngine.setApiKey(provider, key);
    this.showToast(`Testando conexão com ${provider}...`, 'info');

    const savedFinish = VoiceEngine.onFinish;
    const savedError = VoiceEngine.onError;

    VoiceEngine.onFinish = () => {
      this.showToast(`${provider} conectado! Voz reproduzida.`, 'success');
      VoiceEngine.onFinish = savedFinish;
      VoiceEngine.onError = savedError;
    };

    VoiceEngine.onError = (msg) => {
      this.showToast(`Falha: ${msg}`, 'error');
      VoiceEngine.onFinish = savedFinish;
      VoiceEngine.onError = savedError;
    };

    VoiceEngine.setProvider(provider);
    try {
      await VoiceEngine.speak(['Teste de voz artificial.'], { style: 'pop', pitch: 1.0, rate: 1.0, volume: 1.0 });
    } catch (e) {
      this.showToast(`Erro: ${e.message}`, 'error');
      VoiceEngine.onFinish = savedFinish;
      VoiceEngine.onError = savedError;
    }
  },

  exportTxt() {
    const text = this.elements.lyrics.value.trim();
    if (!text) { this.showToast('Nada para exportar', 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `letra-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.showToast('Arquivo exportado!', 'success');
  },

  downloadAudio() {
    if (!this.state.recordedBlob) {
      this.showToast('Nenhum áudio gravado disponível', 'error');
      return;
    }
    const style = this.elements.styleSelect.value;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(this.state.recordedBlob);
    a.download = `instrumental-${style}-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.showToast('Download do áudio iniciado!', 'success');
  },

  clearLyrics() {
    if (this.state.isPlaying) return;
    this.elements.lyrics.value = '';
    this.updateCharCount();
    this.elements.aiAnalysis.style.display = 'none';
    this.showToast('Letra limpa', 'info');
  },

  addHistory() {
    const text = this.elements.lyrics.value.trim();
    if (!text) return;
    const style = this.elements.styleSelect.value;
    const styleCfg = this.styleConfigs[style];
    const firstLine = text.split('\n')[0].substring(0, 50);
    const entry = {
      id: Date.now(),
      title: firstLine || 'Sem título',
      style: styleCfg.emoji + ' ' + style,
      date: new Date().toLocaleString('pt-BR'),
      lyrics: text,
    };
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('ai_singer_history') || '[]');
    } catch {}
    history.unshift(entry);
    if (history.length > 20) history = history.slice(0, 20);
    try { localStorage.setItem('ai_singer_history', JSON.stringify(history)); } catch {}
    this.renderHistory();
  },

  loadHistory() {
    this.renderHistory();
  },

  renderHistory() {
    const el = this.elements.historyList;
    let history = [];
    try { history = JSON.parse(localStorage.getItem('ai_singer_history') || '[]'); } catch {}
    if (history.length === 0) {
      el.innerHTML = '<div class="history-empty">Nenhuma música criada ainda</div>';
      return;
    }
    el.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <span class="hi-title">${this.escapeHtml(item.title)}</span>
        <span class="hi-meta">${item.style} • ${item.date}</span>
      </div>
    `).join('');

    el.querySelectorAll('.history-item').forEach(div => {
      div.addEventListener('click', () => {
        const id = parseInt(div.dataset.id);
        const item = history.find(h => h.id === id);
        if (item) {
          this.elements.lyrics.value = item.lyrics;
          this.updateCharCount();
          this.showToast('Letra carregada do histórico', 'info');
        }
      });
    });
  },

  clearHistory() {
    try { localStorage.removeItem('ai_singer_history'); } catch {}
    this.renderHistory();
    this.showToast('Histórico limpo', 'info');
  },

  escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  },

  showToast(msg, type) {
    const el = this.elements.toast;
    el.textContent = msg;
    el.className = 'toast ' + (type || 'info') + ' show';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  App.loadSavedLyrics();
});
