// El plan de edición (lo que deciden los expertos) y su línea de tiempo.
(function () {
  MM.defaultAudio = () => ({
    voiceVolume: 1, cleanup: 0, voicePreset: 'none', eqLow: 0, eqMid: 0, eqHigh: 0, compression: 0, reverb: 0,
    music: '', musicVolume: 0.5, musicStart: 0, ducking: 0.6, fadeInOut: true, musicMood: 'none', musicPrompt: '',
  });
  MM.defaultCaptions = () => ({
    enabled: false, template: 'karaoke', font: 'montserrat', color: '#FFFFFF', highlightColor: '#FFE600',
    y: 0.78, size: 0.055, uppercase: true, maxWords: 4,
  });
  const clip = (source, start, end) => ({
    kind: 'clip', source, sourceStart: start, sourceEnd: end, speed: 1, focusX: 0.5, focusY: 0.45,
    transitionIn: { type: 'none', duration: 0 }, aiPrompt: '', aiCamera: 'static', aiUseFrame: false, aiDuration: 0,
  });
  MM.clipSegment = clip;

  MM.emptyPlan = (project) => ({
    title: 'Mi video', summary: '', format: 'original',
    segments: project.sources.map((s, i) => clip(i, 0, s.kind === 'image' ? 3 : s.duration)),
    color: MM.neutralGrade(), texts: [], captions: MM.defaultCaptions(), effects: [], audio: MM.defaultAudio(), sfx: [],
  });

  MM.aiKey = (seg) => [seg.aiPrompt, seg.aiCamera, seg.aiUseFrame ? `${seg.source}@${(+seg.sourceStart).toFixed(2)}` : 'txt', seg.aiDuration > 7.5 ? 10 : 5].join('|');

  /// Corrige valores fuera de rango.
  MM.sanitizePlan = (plan, project) => {
    const n = project.sources.length;
    plan.format = ['original', '9:16', '4:5', '1:1', '16:9', '21:9'].includes(plan.format) ? plan.format : 'original';
    plan.segments = (plan.segments || []).map((s) => Object.assign(clip(0, 0, 1), s)).filter((s) => {
      s.speed = MM.clamp(+s.speed || 1, 0.25, 4);
      s.focusX = MM.clamp(+s.focusX, 0, 1); s.focusY = MM.clamp(+s.focusY, 0, 1);
      s.transitionIn = Object.assign({ type: 'none', duration: 0 }, s.transitionIn);
      if (!MM.TRANSITIONS.includes(s.transitionIn.type)) s.transitionIn.type = 'crossfade';
      s.transitionIn.duration = MM.clamp(+s.transitionIn.duration, 0, 1.5);
      if (s.kind === 'ai_video') {
        s.aiDuration = s.aiDuration > 7.5 ? 10 : 5;
        s.source = MM.clamp(s.source | 0, 0, Math.max(0, n - 1));
        if (!s.aiPrompt) s.aiPrompt = 'cinematic shot';
        if (!MM.CAMERAS.includes(s.aiCamera)) s.aiCamera = 'dolly_in';
        if (!n) s.aiUseFrame = false;
        return true;
      }
      s.kind = 'clip';
      if (!n) return false;
      s.source = MM.clamp(s.source | 0, 0, n - 1);
      const src = project.sources[s.source];
      const max = src.kind === 'image' ? 30 : src.duration;
      s.sourceStart = MM.clamp(+s.sourceStart, 0, max);
      s.sourceEnd = MM.clamp(+s.sourceEnd, 0, max);
      return s.sourceEnd - s.sourceStart >= 0.2;
    });
    if (!plan.segments.length && n) plan.segments = [clip(0, 0, project.sources[0].kind === 'image' ? 3 : project.sources[0].duration)];
    if (plan.segments[0]) plan.segments[0].transitionIn = { type: 'none', duration: 0 };
    plan.color = Object.assign(MM.neutralGrade(), plan.color);
    plan.texts = (plan.texts || []).filter((t) => t && String(t.text || '').trim() && plan.segments[t.segmentIndex])
      .map((t) => Object.assign(MM.basicText(''), t));
    plan.captions = Object.assign(MM.defaultCaptions(), plan.captions);
    plan.captions.maxWords = MM.clamp(plan.captions.maxWords | 0 || 4, 1, 10);
    plan.effects = (plan.effects || []).filter((e) => MM.EFFECTS.includes(e.type) && (e.segmentIndex === -1 || plan.segments[e.segmentIndex]));
    plan.audio = Object.assign(MM.defaultAudio(), plan.audio);
    if (!MM.MUSIC_MOODS.includes(plan.audio.musicMood)) plan.audio.musicMood = 'none';
    plan.sfx = (plan.sfx || []).filter((x) => x && MM.SFX_TYPES.includes(x.type) && (x.segmentIndex === -1 || plan.segments[x.segmentIndex]))
      .map((x) => Object.assign({ startOffset: 0, volume: 0.8 }, x, { volume: MM.clamp(+x.volume || 0.8, 0, 1.5) }));
    if (plan.audio.music && !project.songs.some((s) => s.name === plan.audio.music)) plan.audio.music = '';
    return plan;
  };

  MM.renderSize = (plan, project) => {
    const q = MM.settings.quality === '1080' ? 1080 : 720;
    const ratios = { '9:16': 9 / 16, '4:5': 4 / 5, '1:1': 1, '16:9': 16 / 9, '21:9': 21 / 9 };
    let r = ratios[plan.format];
    if (!r) {
      const first = project.sources.find((s) => s.kind === 'video') || project.sources[0];
      r = first ? first.width / first.height : 9 / 16;
    }
    const even = (v) => Math.max(2, Math.round(v / 2) * 2);
    return r >= 1 ? { w: even(q * r), h: q } : { w: q, h: even(q / r) };
  };

  /// Segmentos → posiciones en la línea de tiempo (con solapes para las transiciones).
  MM.buildTimeline = (plan, project) => {
    const items = [];
    let prevEnd = 0, prevDur = 0;
    plan.segments.forEach((seg, index) => {
      let src = null, dur;
      if (seg.kind === 'ai_video') {
        src = project.aiClips[MM.aiKey(seg)] || null;
        dur = src ? Math.min(src.duration, seg.aiDuration || 5) : (seg.aiDuration || 5);
      } else {
        src = project.sources[seg.source];
        dur = (seg.sourceEnd - seg.sourceStart) / seg.speed;
      }
      if (!(dur > 0.05)) return;
      let overlap = 0;
      if (items.length && seg.transitionIn.type !== 'none') overlap = Math.min(seg.transitionIn.duration, prevDur / 2, dur / 2);
      const start = items.length ? prevEnd - overlap : 0;
      items.push({ index, seg, src, start, dur, overlapIn: overlap, lane: items.length % 2 });
      prevEnd = start + dur; prevDur = dur;
    });
    return { items, total: prevEnd };
  };

  /// Efectos ubicados en la línea de tiempo.
  MM.scheduleEffects = (plan, tl) => {
    const bySeg = {}, global = [];
    const byIndex = {};
    tl.items.forEach((it) => { byIndex[it.index] = it; });
    for (const e of plan.effects) {
      if (e.segmentIndex === -1) {
        global.push({ e, start: e.startOffset || 0, end: e.duration > 0 ? (e.startOffset || 0) + e.duration : tl.total });
      } else if (byIndex[e.segmentIndex]) {
        const it = byIndex[e.segmentIndex];
        const start = it.start + (e.startOffset || 0);
        const end = e.duration > 0 ? Math.min(start + e.duration, it.start + it.dur) : it.start + it.dur;
        (bySeg[e.segmentIndex] = bySeg[e.segmentIndex] || []).push({ e, start, end });
      }
    }
    return { bySeg, global };
  };

  /// Palabras del audio original → tiempos en el video editado.
  MM.timelineWords = (plan, tl, project) => {
    const out = [];
    for (const it of tl.items) {
      if (it.seg.kind !== 'clip' || !it.src || !it.src.words) continue;
      for (const w of it.src.words) {
        if (w.end < it.seg.sourceStart || w.start > it.seg.sourceEnd) continue;
        const s = it.start + (Math.max(w.start, it.seg.sourceStart) - it.seg.sourceStart) / it.seg.speed;
        const e = it.start + (Math.min(w.end, it.seg.sourceEnd) - it.seg.sourceStart) / it.seg.speed;
        if (e > s) out.push({ text: w.text, start: s, end: e });
      }
    }
    return out.sort((a, b) => a.start - b.start);
  };

  /// Efectos de sonido en segundos absolutos.
  MM.scheduleSfx = (plan, tl) => {
    const byIndex = {};
    tl.items.forEach((it) => { byIndex[it.index] = it; });
    return (plan.sfx || []).map((x) => {
      const base = x.segmentIndex === -1 ? 0 : (byIndex[x.segmentIndex] ? byIndex[x.segmentIndex].start : null);
      return base == null ? null : { type: x.type, time: Math.max(0, base + (x.startOffset || 0)), volume: x.volume };
    }).filter(Boolean);
  };

  /// Textos y subtítulos listos para dibujar.
  MM.buildTextItems = (plan, tl, project) => {
    const items = [];
    const byIndex = {};
    tl.items.forEach((it) => { byIndex[it.index] = it; });
    for (const t of plan.texts) {
      const it = byIndex[t.segmentIndex];
      if (!it) continue;
      const start = it.start + (t.startOffset || 0);
      const end = Math.min(start + (t.duration || 2), tl.total);
      if (end - start > 0.1) items.push({ spec: t, start, end });
    }
    const c = plan.captions;
    if (c.enabled) {
      const words = MM.timelineWords(plan, tl, project);
      if (c.template === 'word_pop') {
        words.forEach((w) => {
          const spec = MM.captionSpec(c, w.text);
          spec.size = (c.size || 0.055) * 1.6;
          if (w.text.length > 6) spec.color = c.highlightColor;
          items.push({ spec, start: w.start, end: Math.max(w.end, w.start + 0.25) });
        });
      } else {
        for (const line of MM.linesFromWords(words, 12)) {
          for (let i = 0; i < line.words.length; i += c.maxWords) {
            const chunk = line.words.slice(i, i + c.maxWords);
            const spec = MM.captionSpec(c, chunk.map((w) => w.text).join(' '));
            const item = { spec, start: chunk[0].start, end: Math.max(chunk[chunk.length - 1].end + 0.15, chunk[0].start + 0.4) };
            if (c.template === 'karaoke') { item.wordTimes = chunk.map((w) => [w.start, Math.max(w.end, w.start + 0.05)]); item.highlightColor = c.highlightColor; }
            items.push(item);
          }
        }
      }
    }
    return items;
  };
})();
