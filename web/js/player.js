// Reproductor: arma cada cuadro en la GPU, sincroniza con el audio y exporta el video final.
(function () {
  function makeDeck(host) {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
    host.appendChild(v);
    return v;
  }

  class Player {
    constructor(canvas, host) {
      this.canvas = canvas;
      this.renderer = new MM.Renderer(canvas);
      this.decks = [makeDeck(host), makeDeck(host)];
      this.textCanvas = document.createElement('canvas');
      this.textCtx = this.textCanvas.getContext('2d');
      this.audio = new MM.AudioEngine();
      this.t = 0;
      this.playing = false;
      this.onTime = null;
      this.onEnd = null;
    }

    load(project, plan) {
      this.project = project;
      this.plan = plan;
      this.tl = MM.buildTimeline(plan, project);
      const size = MM.renderSize(plan, project, '720');   // vista previa ligera; se exporta en la calidad elegida
      if (size.w !== this.renderer.w || size.h !== this.renderer.h) this.renderer.resize(size.w, size.h);
      this.textCanvas.width = size.w; this.textCanvas.height = size.h;
      this.fit();
      this.textItems = MM.buildTextItems(plan, this.tl, project);
      this.fx = MM.scheduleEffects(plan, this.tl);
      this.grade = MM.effectiveGrade(plan.color);
      [...new Set((plan.sfx || []).map((x) => x.type))].forEach((t) => MM.sfxBuffer(t));
      this.t = MM.clamp(this.t, 0, Math.max(0, this.tl.total - 0.05));
      const wasPlaying = this.playing;
      if (wasPlaying) { this.pause(); this.play(); } else { this.seek(this.t); }
    }

    /// Ajusta el lienzo a la caja de vista previa sin deformar.
    fit() {
      const box = this.canvas.parentElement.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const r = this.renderer.w / this.renderer.h;
      let w = box.width, h = w / r;
      if (h > box.height) { h = box.height; w = h * r; }
      this.canvas.style.width = Math.floor(w) + 'px';
      this.canvas.style.height = Math.floor(h) + 'px';
    }

    get duration() { return this.tl ? this.tl.total : 0; }

    sourceTime(it, t) {
      if (it.seg.kind === 'clip') return it.seg.sourceStart + (t - it.start) * it.seg.speed;
      return t - it.start;
    }

    activeAt(t) {
      const items = this.tl.items;
      for (let k = 0; k < items.length; k++) {
        const it = items[k], end = it.start + it.dur;
        if (t >= it.start && t < end) {
          const next = items[k + 1];
          if (next && next.overlapIn > 0 && t >= next.start) {
            return { a: it, b: next, p: (t - next.start) / next.overlapIn, type: MM.TRANSITIONS.indexOf(next.seg.transitionIn.type) };
          }
          return { a: it };
        }
      }
      const last = items[items.length - 1];
      return last ? { a: last } : {};
    }

    /// Pone el "deck" de un clip en su lugar (archivo + segundo).
    deckFor(it, t, playing) {
      if (!it || !it.src) return null;
      if (it.src.kind === 'image') return { el: it.src.el, w: it.src.width, h: it.src.height };
      const d = this.decks[it.lane];
      if (d.dataset.url !== it.src.url) { d.dataset.url = it.src.url; d.src = it.src.url; d.load(); }
      const want = MM.clamp(this.sourceTime(it, t), 0, Math.max(0, it.src.duration - 0.04));
      if (playing) {
        if (Math.abs(d.playbackRate - it.seg.speed) > 0.01) d.playbackRate = it.seg.speed;
        if (Math.abs(d.currentTime - want) > 0.3) d.currentTime = want;
        if (d.paused) d.play().catch(() => {});
      } else if (Math.abs(d.currentTime - want) > 0.02) {
        d.currentTime = want;
      }
      return d.readyState >= 2 ? { el: d, w: d.videoWidth, h: d.videoHeight } : { el: null, w: 0, h: 0 };
    }

    preload(t) {
      const items = this.tl.items;
      const act = this.activeAt(t);
      const busy = new Set([act.a?.lane, act.b?.lane]);
      for (const it of items) {
        if (it.start > t && it.start - t < 1.5 && !busy.has(it.lane) && it.src && it.src.kind === 'video') {
          const d = this.decks[it.lane];
          if (d.dataset.url !== it.src.url) { d.dataset.url = it.src.url; d.src = it.src.url; d.load(); }
          const want = this.sourceTime(it, it.start);
          if (Math.abs(d.currentTime - want) > 0.1) d.currentTime = want;
          if (!d.paused) d.pause();
          break;
        }
      }
      for (let lane = 0; lane < 2; lane++) if (!busy.has(lane) && !this.decks[lane].paused) this.decks[lane].pause();
    }

    renderFrame(t, playing) {
      if (!this.tl || !this.tl.items.length) return;
      const act = this.activeAt(t);
      const layer = (i, it) => {
        const src = this.deckFor(it, t, playing);
        const segFx = (this.fx.bySeg[it.index] || []).concat(this.fx.global);
        this.renderer.drawLayer(i, src && src.el, src ? src.w : 0, src ? src.h : 0, {
          focusX: it.seg.focusX, focusY: it.seg.focusY,
          cam: MM.cameraAt(segFx, t), time: t, grade: this.grade, fx: MM.fxAt(segFx, t),
        });
      };
      if (act.a) layer(0, act.a);
      if (act.b) layer(1, act.b);
      const segFx = [].concat(this.fx.global, act.a ? this.fx.bySeg[act.a.index] || [] : [], act.b ? this.fx.bySeg[act.b.index] || [] : []);
      const o = MM.overlayAt(segFx, t);

      // Textos
      const ctx = this.textCtx, W = this.textCanvas.width, H = this.textCanvas.height;
      ctx.clearRect(0, 0, W, H);
      let anyText = false;
      for (const item of this.textItems) {
        if (t >= item.start && t <= item.end) { MM.drawText(ctx, item, t, W, H); anyText = true; }
      }
      this.renderer.drawMix({
        two: !!act.b, progress: act.p || 0, type: act.type || 0, time: t,
        flash: o.flash, leak: o.leak, leakA: o.leakA, leakB: o.leakB, letterbox: o.letterbox,
        grain: this.grade.grain, vignette: this.grade.vignette, bloom: this.grade.bloom,
      }, anyText ? this.textCanvas : null);
      if (playing) this.preload(t);
    }

    play() {
      if (!this.tl || this.playing) return;
      const c = MM.audioCtx();
      if (c.state !== 'running') c.resume().catch(() => {});
      if (this.t >= this.tl.total - 0.05) this.t = 0;
      this.playing = true;
      this.audio.start(this.plan, this.tl, this.project, this.t, false);
      this.loop();
    }

    loop() {
      if (!this.playing) return;
      const ctx = MM.audioCtx();
      const t = this.audio.t0 + Math.max(0, ctx.currentTime - this.audio.startedAt);
      this.t = t;
      if (t >= this.tl.total) {
        this.pause();
        this.t = this.tl.total;
        this.onEnd?.();
        return;
      }
      this.renderFrame(t, true);
      this.onTime?.(t);
      this.raf = requestAnimationFrame(() => this.loop());
    }

    pause() {
      this.playing = false;
      cancelAnimationFrame(this.raf);
      this.audio.stop();
      this.decks.forEach((d) => d.pause());
    }

    async seek(t) {
      if (!this.tl) return;
      this.t = MM.clamp(t, 0, Math.max(0, this.tl.total - 0.02));
      const act = this.activeAt(this.t);
      [act.a, act.b].forEach((it) => this.deckFor(it, this.t, false));
      await Promise.all(this.decks.map(async (d) => {
        if (!d.src) return;
        await MM.videoReady(d, 4000);
        [act.a, act.b].forEach((it) => { if (it && this.decks[it.lane] === d) this.deckFor(it, this.t, false); });
        await MM.videoReady(d, 4000);
      }));
      this.renderFrame(this.t, false);
      this.onTime?.(this.t);
    }

    /// Fotos del video final (para Control de Calidad).
    async snapshots(times, maxSide = 640) {
      const out = [];
      const c = document.createElement('canvas');
      const k = Math.min(1, maxSide / Math.max(this.renderer.w, this.renderer.h));
      c.width = Math.round(this.renderer.w * k); c.height = Math.round(this.renderer.h * k);
      const ctx = c.getContext('2d');
      for (const t of times) {
        await this.seek(t);
        ctx.drawImage(this.canvas, 0, 0, c.width, c.height);
        out.push({ time: t, data: c.toDataURL('image/jpeg', 0.72).split(',')[1] });
      }
      return out;
    }

    /// Exporta el video final (se graba en tiempo real).
    async export(onProgress) {
      this.pause();
      this.t = 0;
      await this.seek(0);
      const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
      const mime = types.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
      if (!mime) throw new Error('Este navegador no puede grabar video. Usa Safari o Chrome actualizados.');
      const video = this.canvas.captureStream(30);
      const audioStream = this.audio.start(this.plan, this.tl, this.project, 0, true);
      const tracks = [...video.getVideoTracks(), ...(audioStream ? audioStream.getAudioTracks() : [])];
      const rec = new MediaRecorder(new MediaStream(tracks), {
        mimeType: mime, videoBitsPerSecond: this.renderer.h >= 1080 ? 12_000_000 : 8_000_000, audioBitsPerSecond: 192_000,
      });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const done = new Promise((r) => { rec.onstop = r; });
      rec.start(500);
      this.playing = true;
      const total = this.tl.total;
      const ctx0 = MM.audioCtx();
      if (ctx0.state !== 'running') { try { await ctx0.resume(); } catch { /* */ } }
      if (ctx0.state !== 'running') { rec.stop(); this.audio.stop(); throw new Error('El audio está bloqueado: toca la pantalla y vuelve a exportar.'); }
      await new Promise((resolve) => {
        const step = () => {
          const ctx = MM.audioCtx();
          const t = Math.max(0, ctx.currentTime - this.audio.startedAt);
          this.t = t;
          if (t >= total) { resolve(); return; }
          this.renderFrame(t, true);
          onProgress?.(t / total);
          this.raf = requestAnimationFrame(step);
        };
        step();
      });
      this.playing = false;
      rec.stop();
      await done;
      this.audio.stop();
      this.decks.forEach((d) => d.pause());
      const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
      return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext };
    }
  }
  MM.Player = Player;
})();
