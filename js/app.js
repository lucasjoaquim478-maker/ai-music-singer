const App = {
  state: {
    voices: [],
    currentLine: 0,
    totalLines: 0,
    isPlaying: false,
    isPaused: false,
    isGenerating: false,
    currentUtterance: null,
    currentTimeout: null,
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
    this.cacheElements();
    this.bindEvents();
    this.loadVoices();
    this.loadHistory();
    this.updateCharCount();
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
    el.styleSelect.addEventListener('change', () => this.updateStylePreview());

    el.btnGerar.addEventListener('click', () => this.generate());
    el.btnParar.addEventListener('click', () => this.stop());
    el.btnPausar.addEventListener('click', () => this.togglePause());
    el.btnSalvar.addEventListener('click', () => this.saveLyrics());
    el.btnExportar.addEventListener('click', () => this.exportTxt());
    el.btnLimpar.addEventListener('click', () => this.clearLyrics());
    el.btnLimparHistorico.addEventListener('click', () => this.clearHistory());

    window.addEventListener('beforeunload', () => this.stop());
  },

  loadVoices() {
    const synth = window.speechSynthesis;
    const load = () => {
      const voices = synth.getVoices().filter(v => v.lang.startsWith('pt') || v.lang.startsWith('en'));
      this.state.voices = voices.length > 0 ? voices : synth.getVoices();
      this.populateVoices();
    };
    load();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = load;
    }
    setTimeout(load, 1000);
  },

  populateVoices() {
    const el = this.elements.voiceSelect;
    el.innerHTML = '';
    this.state.voices.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${v.name} (${v.lang})`;
      el.appendChild(opt);
    });
    if (this.state.voices.length === 0) {
      el.innerHTML = '<option value="">Nenhuma voz disponível</option>';
    }
  },

  updateStylePreview() {
    const style = this.elements.styleSelect.value;
    const cfg = this.styleConfigs[style];
    this.elements.previewLabel.textContent = `${cfg.emoji} ${style.charAt(0).toUpperCase() + style.slice(1)} • ${cfg.desc}`;
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

    this.setStatus('Gerando música...', 'generating');
    this.elements.btnGerar.disabled = true;
    this.elements.btnParar.disabled = false;
    this.elements.btnPausar.disabled = false;
    this.elements.pauseText.textContent = 'Pausar';
    this.elements.pauseIcon.textContent = '⏸';
    this.elements.progressContainer.style.display = 'block';
    this.elements.currentLine.textContent = '🎵 Iniciando...';
    this.updateProgress(0, 0);

    this.playLine(0);
  },

  playLine(index) {
    if (!this.state.isPlaying || this.state.isPaused || index >= this.state.totalLines) {
      if (index >= this.state.totalLines && this.state.isPlaying) {
        this.finish();
      }
      return;
    }

    const lines = this.getLines();
    this.state.currentLine = index;
    const line = lines[index];
    const style = this.elements.styleSelect.value;
    const cfg = this.styleConfigs[style];
    const voiceIdx = parseInt(this.elements.voiceSelect.value);
    const speed = parseFloat(this.elements.speedRange.value);
    const volume = parseInt(this.elements.volumeRange.value) / 100;

    this.elements.currentLine.textContent = line;
    this.updateProgress(index + 1, this.state.totalLines);

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = 'pt-BR';
    utterance.volume = volume;
    utterance.rate = speed * cfg.rate;
    utterance.pitch = cfg.pitch;

    if (this.state.voices[voiceIdx]) {
      utterance.voice = this.state.voices[voiceIdx];
    }

    this.state.currentUtterance = utterance;

    if (index < this.state.totalLines - 1) {
      utterance.onend = () => {
        if (this.state.isPlaying && !this.state.isPaused) {
          this.playLine(index + 1);
        }
      };
    } else {
      utterance.onend = () => this.finish();
    }

    utterance.onerror = (e) => {
      console.error('Erro no speech:', e);
    };

    this.setStatus(`Cantando: linha ${index + 1} de ${this.state.totalLines}`, 'playing');
    synth.speak(utterance);
  },

  stop() {
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.isGenerating = false;
    this.state.currentLine = 0;

    window.speechSynthesis.cancel();

    if (this.state.currentTimeout) {
      clearTimeout(this.state.currentTimeout);
      this.state.currentTimeout = null;
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
      this.playLine(this.state.currentLine);
    } else {
      this.state.isPaused = true;
      this.elements.pauseText.textContent = 'Continuar';
      this.elements.pauseIcon.textContent = '▶';
      this.setStatus('Pausado', 'paused');
      window.speechSynthesis.cancel();
    }
  },

  finish() {
    if (!this.state.isPlaying) return;
    this.state.isPlaying = false;
    this.state.isGenerating = false;

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

  clearLyrics() {
    if (this.state.isPlaying) return;
    this.elements.lyrics.value = '';
    this.updateCharCount();
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
