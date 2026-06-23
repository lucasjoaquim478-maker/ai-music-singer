const LyricsAnalyzer = {
  moodWords: {
    happy: [
      'alegria','alegre','feliz','felicidade','amor','amar','sorrir','sorriso','dançar',
      'dança','bailar','sol','brilhar','brilho','luz','colorido','vida','viver','vivo',
      'sonhar','sonho','celebrar','festa','festejar','alegrar','radiante','júbilo','prazer',
      'prazeroso','deleite','contentamento','alegrar','exultar','júbilo','contentar',
      'paixão','coração','beijo','abraço','querer','desejo','lindo','linda','bonito',
      'maravilha','maravilhoso','encanto','encantar','magia','mágico','fantasia',
      'esperança','acreditar','confiar','gratidão','grato','abençoado','benção',
      'juntos','unidos','abraçar','carinho','doce','suave','terno','ternura','afeto',
      'explodir','festa','party','fogo','energia','vibrar','intenso','poderoso',
    ],
    sad: [
      'triste','tristeza','saudade','chorar','choro','dor','sofrer','sofrimento',
      'solidão','sozinho','solitário','noite','escuro','escuridão','lágrima','pranto',
      'coração partido','partido','quebrado','ausência','falta','perder','perda',
      'adeus','despedida','partir','deixar','ir embora','esquecer','esquecido',
      'vazio','vazia','silêncio','calado','mudo','saudoso','melancolia','melancólico',
      'nostalgia','nostálgico','lembrar','memória','passado','tempo','saudades',
      'distância','longe','ausente','saudade','ingovernável','angústia','angustiado',
      'desgosto','desilusão','decepção','desapontamento','magoa','magoado',
      'cansaço','cansado','desânimo','abatido','desolado','desespero','desesperado',
      'despedaçar','lamento','gemido','pranto','neblina','nevoeiro','garoa',
    ],
    energetic: [
      'explodir','explosão','energia','fogo','poder','intenso','forte','força',
      'correr','acelerar','rápido','velocidade','ação','fúria','fugir','lutar',
      'fúria','tempestade','trovão','raio','vulcão','incêndio','queimar','arder',
      'gritar','bradar','rugir','turbilhão','potência','vigor','vibrante','elétrico',
      'dinâmico','intenso','extremo','radical','frenético','agitado','tumulto',
      'inferno','selvagem','animal','fera','indomável','liberdade','livre','ousado',
    ],
    calm: [
      'paz','pacífico','calma','calmo','sereno','tranquilo','mar','onda','oceano',
      'vento','brisa','suave','leve','manso','doce','silêncio','quieto','sossego',
      'descansar','descanso','relaxar','relaxamento','meditar','meditação','zen',
      'harmonia','equilíbrio','plenitude','natureza','verde','árvore','flor','rio',
      'cachoeira','montanha','campo','jardim','céu','estrela','luar','amanhecer',
      'entardecer','pôr do sol','orvalho','serenidade','bonança','maciez','aconchego',
      'conforto','acolhimento','refúgio','abrigo','ninho','grato','gratidão','benigno',
    ],
  },

  themeWords: {
    love: [
      'amor','amar','paixão','coração','beijo','abraço','querer','desejo','romance',
      'romântico','namorar','namoro','casal','encontro','paquerar','sedução','seduzir',
      'conquistar','conquista','casar','casamento','noiva','noivo','alma gêmea',
      'eterno','para sempre','juntos','unidos','te amo','te quero','meu bem','querida',
      'amada','amado','tesouro','princesa','príncipe','amoroso','afeto','carinho',
      'ternura','doce amor','paixão ardente','amor eterno','coração apaixonado',
    ],
    party: [
      'festa','balada','dançar','dança','night','party','vip','club','boate',
      'farra','celebrar','comemorar','bebida','whisky','cerveja','batida','glow',
      'palco','show','pista','DJ','toca','som','grave','batidão','multidão',
      'vibrar','energia','alegria','explodir','fogos','confete','brilho','luzes',
      'sábado','sexta','findi','rolê','nightclub','festejar','comemoração',
    ],
    nature: [
      'natureza','verde','árvore','flor','rio','cachoeira','montanha','campo',
      'jardim','mar','oceano','praia','sol','céu','estrela','luar','vento',
      'brisa','orvalho','amanhecer','entardecer','pôr do sol','paisagem','horizonte',
      'floresta','selva','animal','passarinho','pássaro','borboleta','abelha',
      'primavera','verão','outono','inverno','estações','clima','tempo','chuva',
    ],
    night: [
      'noite','escuro','escuridão','luar','lua','estrela','constelação','céu noturno',
      'neblina','nevoeiro','garoa','sereno','madrugada','insônia','sono','sonhar',
      'luzes da cidade','poste','rua vazia','perigo','mistério','sombra','assombro',
      'lobisomem','vampiro','sobrenatural','medo','pavor','trevas','noturno',
    ],
    spiritual: [
      'deus','senhor','jesus','cristo','fé','crença','oração','rezar','igreja',
      'templo','sagrado','santo','milagre','salvação','graça','benção','louvor',
      'adorar','adoração','glória','aleluia','amém','espírito','santo','gratidão',
      'propósito','missão','divino','eterno','paraíso','céu','anjo','luz divina',
      'espiritualidade','religião','crente','evangelho','salmos','cântico','jubilo',
    ],
  },

  sectionMarkers: {
    chorus: ['refrão','chorus','hook','repeat','volta','bis'],
    verse: ['estrofe','verse','parte'],
    intro: ['intro','introdução','começo'],
    bridge: ['ponte','bridge','ligação'],
    outro: ['outro','final','fim','encerramento'],
  },

  analyze(text) {
    if (!text || text.trim().length === 0) return this.defaultAnalysis();

    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    const lines = text.split('\n').filter(l => l.trim().length > 0);

    const mood = this.analyzeMood(words);
    const theme = this.analyzeTheme(words);
    const sections = this.detectSections(lines);
    const hasChorus = sections.includes('chorus');
    const repetitionScore = this.calcRepetition(lines);
    const wordCount = words.length;

    const intensity = this.calcIntensity(mood, wordCount);
    const bpm = this.suggestBpm(mood, theme, intensity);

    const scale = mood === 'sad' || mood === 'calm' ? 'minor' : 'major';

    const summary = this.generateSummary(mood, theme, intensity, hasChorus);

    return {
      mood,
      theme,
      scale,
      bpm,
      intensity,
      hasChorus,
      sections,
      repetitionScore,
      wordCount,
      lineCount: lines.length,
      summary,
    };
  },

  defaultAnalysis() {
    return {
      mood: 'neutral',
      theme: 'other',
      scale: 'major',
      bpm: 116,
      intensity: 0.5,
      hasChorus: false,
      sections: [],
      repetitionScore: 0,
      wordCount: 0,
      lineCount: 0,
      summary: 'Tema neutro • Andamento médio',
    };
  },

  analyzeMood(words) {
    const scores = { happy: 0, sad: 0, energetic: 0, calm: 0 };

    for (const word of words) {
      const clean = word.replace(/[^a-zà-ú]/g, '');
      for (const [mood, wordList] of Object.entries(this.moodWords)) {
        if (wordList.includes(clean)) {
          scores[mood] += 2;
        }
        for (const w of wordList) {
          if (w.includes(' ') && clean.includes(w)) {
            scores[mood] += 3;
          }
        }
      }
    }

    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    if (total === 0) return 'neutral';

    let best = 'neutral';
    let bestScore = 0;

    for (const [mood, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        best = mood;
      }
    }

    if (bestScore < 3) return 'neutral';
    return best;
  },

  analyzeTheme(words) {
    const scores = { love: 0, party: 0, nature: 0, night: 0, spiritual: 0, other: 1 };

    for (const word of words) {
      const clean = word.replace(/[^a-zà-ú]/g, '');
      for (const [theme, wordList] of Object.entries(this.themeWords)) {
        if (wordList.includes(clean)) {
          scores[theme] = (scores[theme] || 0) + 2;
        }
      }
    }

    let best = 'other';
    let bestScore = 0;

    for (const [theme, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        best = theme;
      }
    }

    return best;
  },

  detectSections(lines) {
    const sections = [];

    for (const line of lines) {
      const lower = line.toLowerCase().trim();

      for (const [section, markers] of Object.entries(this.sectionMarkers)) {
        for (const marker of markers) {
          if (lower.includes(marker)) {
            if (!sections.includes(section)) sections.push(section);
          }
        }
      }
    }

    if (sections.length === 0) {
      if (lines.length >= 8) sections.push('verse', 'verse');
      if (lines.length >= 16) sections.push('chorus');
    }

    return sections;
  },

  calcRepetition(lines) {
    if (lines.length < 2) return 0;
    let repeats = 0;
    const seen = new Set();

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (seen.has(trimmed)) repeats++;
      seen.add(trimmed);
    }

    return Math.min(repeats / lines.length, 1);
  },

  calcIntensity(mood, wordCount) {
    const base = {
      happy: 0.7,
      sad: 0.3,
      energetic: 0.9,
      calm: 0.2,
      neutral: 0.5,
    };

    let intensity = base[mood] || 0.5;
    intensity += Math.min(wordCount / 200, 0.3);
    return Math.min(intensity, 1);
  },

  suggestBpm(mood, theme, intensity) {
    const moodBpm = {
      happy: 120,
      sad: 72,
      energetic: 140,
      calm: 70,
      neutral: 100,
    };

    const themeAdjust = {
      love: 0,
      party: 20,
      nature: -10,
      night: -10,
      spiritual: -15,
      other: 0,
    };

    let bpm = (moodBpm[mood] || 100) + (themeAdjust[theme] || 0);
    bpm += (intensity - 0.5) * 40;
    return Math.max(60, Math.min(160, Math.round(bpm / 2) * 2));
  },

  generateSummary(mood, theme, intensity, hasChorus) {
    const moodLabel = {
      happy: '😊 Alegre',
      sad: '😢 Triste',
      energetic: '🔥 Energético',
      calm: '😌 Calmo',
      neutral: '🎵 Neutro',
    };

    const themeLabel = {
      love: '❤️ Amor',
      party: '🎉 Festa',
      nature: '🌿 Natureza',
      night: '🌙 Noturno',
      spiritual: '🙏 Spiritual',
      other: '🎶 Livre',
    };

    const intensityLabel = intensity > 0.7 ? 'Intenso' : intensity > 0.4 ? 'Médio' : 'Suave';

    return `${moodLabel[mood]} • ${themeLabel[theme]} • ${intensityLabel}`;
  },
};
