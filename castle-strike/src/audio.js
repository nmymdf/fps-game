// 全程式合成：DOS 時代 FM 音源風格的音樂 + 音效（WebAudio）
const MINOR = [0, 2, 3, 5, 7, 8, 11]; // 和聲小調：第七級升高，帶出軍樂的緊張感
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function degSemi(d) { const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return o * 12 + MINOR[i]; }
const P = (s) => s.trim().split(/\s+/).map((t) => (t === '.' || t === '-' ? t : Number(t)));

// ---------- 曲目 ----------
// prog: 和弦根音(音階級數)；dom=大三和弦(屬和弦)。mel: 每小節8個八分音符。
export const TRACKS = {
  courtyard: {
    name: '庭院行軍', bpm: 148, root: 57, drums: 'march', bass: 'walk', arp: 'up', lead: 'fmLead', pad: 'organ', swing: 0,
    prog: [{ r: 0 }, { r: 5 }, { r: 6 }, { r: 4 }, { r: 0 }, { r: 5 }, { r: 4, dom: 1 }, { r: 0 }],
    mel: ['4 2 0 2 4 4 7 6', '5 7 9 7 5 7 9 -', '6 8 10 8 6 8 6 5', '4 6 8 6 4 . 4 -', '7 9 11 9 7 4 7 9', '12 11 9 7 9 11 12 -', '11 8 11 8 7 8 4 .', '7 4 2 4 0 - - -'],
  },
  hall: {
    name: '大廳', bpm: 138, root: 50, drums: 'march', bass: 'pulse', arp: 'updown', lead: 'fmBell', pad: 'strings', swing: 0,
    prog: [{ r: 0 }, { r: 5 }, { r: 2 }, { r: 6 }, { r: 3 }, { r: 5 }, { r: 4, dom: 1 }, { r: 0 }],
    mel: ['2 4 7 4 2 4 7 9', '9 7 5 7 9 12 9 7', '6 4 2 4 6 9 6 4', '6 8 10 8 6 8 10 -', '7 5 3 5 7 10 7 5', '5 7 9 12 9 7 5 .', '11 8 4 8 11 8 4 .', '7 - 4 - 2 4 7 -'],
  },
  library: {
    name: '圖書館', bpm: 84, root: 52, drums: 'soft', bass: 'long', arp: 'updown', lead: 'fmBell', pad: 'strings', swing: 0,
    prog: [{ r: 0 }, { r: 5 }, { r: 6 }, { r: 0 }, { r: 0 }, { r: 3 }, { r: 5 }, { r: 6 }],
    mel: ['4 . 2 . 4 . 7 -', '9 . 7 . 5 . 7 -', '10 . 8 . 6 . 8 -', '7 . 4 . 2 . 4 -', '4 2 4 7 9 7 4 2', '7 . 5 . 3 . 5 -', '9 7 5 7 9 12 9 -', '10 8 6 8 10 8 6 .'],
  },
  cellar: {
    name: '地牢', bpm: 160, root: 48, drums: 'drive', bass: 'drive', arp: 'up', lead: 'fmSaw', pad: 'dark', swing: 0,
    prog: [{ r: 0 }, { r: 5 }, { r: 6 }, { r: 4, dom: 1 }, { r: 0 }, { r: 5 }, { r: 4, dom: 1 }, { r: 0 }],
    mel: ['4 4 2 0 2 4 7 4', '5 7 9 7 5 7 9 7', '6 8 10 8 6 8 10 8', '8 4 8 11 8 4 . .', '7 4 2 4 7 9 11 9', '12 9 7 9 12 9 7 5', '11 8 4 8 11 8 4 8', '7 - 4 - 0 - - -'],
  },
  chapel: {
    name: '禮拜堂', bpm: 88, root: 50, drums: 'soft', bass: 'long', arp: 'updown', lead: 'organLead', pad: 'organ', swing: 0,
    prog: [{ r: 0 }, { r: 2 }, { r: 5 }, { r: 6 }, { r: 0 }, { r: 3 }, { r: 4, dom: 1 }, { r: 0 }],
    mel: ['4 - 2 - 0 - 2 -', '4 - 6 - 4 - 2 -', '7 - 9 - 7 - 5 -', '8 - 10 - 8 - 6 -', '4 - 7 - 9 - 7 -', '5 - 7 - 10 - 7 -', '8 - 11 - 8 - 4 -', '7 - - - 4 - 0 -'],
  },
  throne: {
    name: '王座', bpm: 172, root: 57, drums: 'drive', bass: 'drive', arp: 'up16', lead: 'fmSaw', pad: 'strings', swing: 0,
    prog: [{ r: 0 }, { r: 5 }, { r: 2 }, { r: 6 }, { r: 0 }, { r: 5 }, { r: 4, dom: 1 }, { r: 4, dom: 1 }],
    mel: ['7 4 7 9 11 9 7 4', '5 7 9 12 9 7 5 7', '9 11 13 11 9 11 9 6', '13 10 8 10 13 10 8 6', '7 4 7 9 11 14 11 9', '12 9 7 9 12 9 7 9', '11 8 11 8 4 8 11 .', '11 8 4 8 11 8 11 .'],
  },
};
// 一次性小曲
export const JINGLES = {
  title: { bpm: 96, root: 57, notes: [[0, 7, 4], [2, 9, 4], [4, 11, 6], [8, 14, 8], [12, 11, 2], [14, 9, 2], [16, 12, 4], [20, 11, 2], [22, 9, 2], [24, 7, 12]], chords: [[0, [0, 2, 4], 16], [16, [5, 7, 9], 8], [24, [0, 2, 4], 16]] },
  victory: { bpm: 120, root: 57, notes: [[0, 7, 2], [2, 9, 2], [4, 11, 2], [6, 14, 6], [12, 11, 2], [14, 14, 2], [16, 16, 16]], chords: [[0, [0, 2, 4], 8], [8, [5, 7, 9], 8], [16, [0, 2, 4, 7], 20]] },
  clear: { bpm: 132, root: 57, notes: [[0, 4, 2], [2, 7, 2], [4, 9, 2], [6, 11, 2], [8, 14, 8]], chords: [[0, [0, 2, 4], 8], [8, [0, 2, 4, 7], 12]] },
  death: { bpm: 70, root: 57, notes: [[0, 7, 4], [4, 6, 4], [8, 5, 4], [12, 4, 10]], chords: [[0, [0, 2, 4], 8], [8, [5, 7, 9], 8], [16, [4, 6, 8], 12]] },
};

// ---------- 合成基元 ----------
export class Synth {
  constructor(ctx, dest, rev) {
    this.c = ctx; this.dest = dest; this.rev = rev;
    const len = ctx.sampleRate * 1;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    this.W = {};
    const mk = (fn) => { const N = 256, re = new Float32Array(33), im = new Float32Array(33); for (let k = 1; k < 33; k++) { let sr = 0, si = 0; for (let n = 0; n < N; n++) { const v = fn(n / N * Math.PI * 2); sr += v * Math.cos(k * n / N * Math.PI * 2); si += v * Math.sin(k * n / N * Math.PI * 2); } re[k] = sr * 2 / N; im[k] = si * 2 / N; } return ctx.createPeriodicWave(re, im); };
    this.W.half = mk((x) => Math.max(0, Math.sin(x)));
    this.W.abs = mk((x) => Math.abs(Math.sin(x)));
    this.W.quarter = mk((x) => { const s = Math.sin(x); return (x % Math.PI) < Math.PI / 2 ? Math.abs(s) : 0; });
    const d = this.noiseBuf.getChannelData(0); let s = 12345;
    for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
  }
  out(node, wet = 0.2) { node.connect(this.dest); if (wet > 0 && this.rev) { const g = this.c.createGain(); g.gain.value = wet; node.connect(g); g.connect(this.rev); } }
  // 雙運算子 FM
  fm(t, freq, dur, vol, o = {}) {
    const c = this.c, ratio = o.ratio ?? 1, idx = o.index ?? 2, dec = o.decay ?? 0.3, a = o.attack ?? 0.005, rel = o.release ?? 0.08, wave = o.wave ?? 'sine';
    const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    if (this.W[wave]) car.setPeriodicWave(this.W[wave]); else car.type = wave; car.frequency.value = freq; if (this.W[o.modWave]) mod.setPeriodicWave(this.W[o.modWave]); else mod.type = o.modWave ?? 'sine'; mod.frequency.value = freq * ratio;
    mg.gain.setValueAtTime(freq * idx, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, freq * idx * (o.sustainIdx ?? 0.15)), t + dec);
    mod.connect(mg); mg.connect(car.frequency);
    const end = t + dur;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setTargetAtTime(vol * (o.sustain ?? 0.55), t + a, dec * 0.7);
    g.gain.setTargetAtTime(0.0001, end, rel);
    car.connect(g); if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.2; lg.gain.value = freq * 0.006; l.connect(lg); lg.connect(car.frequency); l.start(t + 0.12); l.stop(end + 0.5); }
    car.start(t); mod.start(t); car.stop(end + rel * 8 + 0.1); mod.stop(end + rel * 8 + 0.1);
    this.out(g, o.wet ?? 0.18);
  }
  tone(t, freq, dur, vol, type = 'triangle', o = {}) {
    const c = this.c, osc = c.createOscillator(), g = c.createGain();
    osc.type = type; osc.frequency.value = freq; if (o.detune) osc.detune.value = o.detune;
    const a = o.attack ?? 0.01, rel = o.release ?? 0.1;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.setTargetAtTime(0.0001, t + dur, rel);
    let n = osc; if (o.filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.filter; osc.connect(f); n = f; }
    n.connect(g); osc.start(t); osc.stop(t + dur + rel * 8 + 0.1);
    this.out(g, o.wet ?? 0.15);
  }
  noise(t, dur, vol, o = {}) {
    const c = this.c, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noiseBuf; src.loop = true; f.type = o.type ?? 'highpass'; f.frequency.setValueAtTime(o.f0 ?? 6000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur); f.Q.value = o.q ?? 0.7;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    return g;
  }
  kick(t, vol = 0.55) {
    const c = this.c, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); o.start(t); o.stop(t + 0.3); this.out(g, 0.03);
  }
  snare(t, vol = 0.3) {
    const g = this.noise(t, 0.16, vol, { type: 'bandpass', f0: 2600, q: 0.8 }); this.out(g, 0.06);
    const o = this.c.createOscillator(), og = this.c.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.08);
    og.gain.setValueAtTime(vol * 0.7, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og); o.start(t); o.stop(t + 0.12); this.out(og, 0.1);
  }
  hat(t, vol = 0.09, open = false) { const g = this.noise(t, open ? 0.14 : 0.04, vol, { type: 'highpass', f0: 8000 }); this.out(g, 0.05); }
  tom(t, f = 100, vol = 0.4) {
    const o = this.c.createOscillator(), g = this.c.createGain();
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); o.start(t); o.stop(t + 0.32); this.out(g, 0.15);
  }
  // 共振峰人聲（敵人喊叫）
  voice(t, f0, f1, dur, vol, v = [700, 1200], o = {}) {
    const c = this.c, osc = c.createOscillator(), g = c.createGain(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const sum = c.createGain(); const out = o.out || this.dest;
    for (const [i, fr] of v.entries()) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = 6 + i * 2;
      const bg = c.createGain(); bg.gain.value = i === 0 ? 1 : 0.6; osc.connect(bp); bp.connect(bg); bg.connect(sum);
    }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.setTargetAtTime(0.0001, t + dur * 0.8, dur * 0.12);
    sum.connect(g); osc.start(t); osc.stop(t + dur + 0.2);
    if (o.node) g.connect(o.node); else this.out(g, 0.1);
  }
}

function chordSemis(ch, root) {
  const base = degSemi(ch.r), t3 = ch.dom ? 4 : degSemi(ch.r + 2) - base, t5 = degSemi(ch.r + 4) - base;
  return [root + base, root + base + ((t3 % 12) + 12) % 12, root + base + ((t5 % 12) + 12) % 12];
}

// ---------- 曲目排程（共用：即時 / 離線）----------
export function scheduleBar(S, tr, bar, t0, inten, lay) {
  // 仿 AdLib/OPL2：乾澀、緊湊、小調重複節奏
  const spb = 60 / tr.bpm, e8 = spb / 2, s16 = spb / 4;
  const bi = bar % tr.prog.length, ch = tr.prog[bi];
  const cs = chordSemis(ch, tr.root - 12);
  const mel = P(tr.mel[bi]);
  const L = lay, dry = 0.04;
  const styl = tr.drums; // march | drive | soft
  // 低音：OPL 低音「咚咚」重複節奏
  if (L.bass > 0.02) {
    const r = cs[0], v = 0.24 * L.bass;
    const hit = (t, n, d) => S.fm(t, mtof(n), d, v, { ratio: 1, index: 3.2, decay: 0.07, sustain: 0.55, sustainIdx: 0.25, wave: 'half', modWave: 'sine', wet: dry, release: 0.02, attack: 0.002 });
    if (styl === 'soft') { hit(t0, r, spb * 0.9); hit(t0 + spb, r + 7, spb * 0.9); hit(t0 + spb * 2, r, spb * 0.9); hit(t0 + spb * 3, r + 7, spb * 0.9); }
    else {
      // 十六分音符奔馳：根音 根音 八度 根音 / 五度…
      const pat = styl === 'drive' ? [0, 0, 12, 0, 0, 0, 12, 0, 7, 7, 12, 7, 0, 0, 12, 10] : [0, 0, 12, 0, 0, 12, 0, 0, 7, 7, 12, 7, 0, 12, 0, 0];
      for (let i = 0; i < 16; i++) hit(t0 + i * s16, r + pat[i], s16 * 0.7);
    }
  }
  // 和絃切分（離拍）：薄而尖的方波感
  if (L.pad > 0.02) {
    const v = 0.05 * L.pad;
    const stab = (t, d) => { for (const n of cs) S.fm(t, mtof(n + 24), d, v, { ratio: 2, index: 1.1, decay: 0.05, sustain: 0.3, wave: 'abs', modWave: 'sine', wet: dry, release: 0.02, attack: 0.002 }); };
    if (styl === 'soft') { for (const n of cs) S.fm(t0, mtof(n + 12), spb * 3.8, v * 0.7, { ratio: 1, index: 0.6, decay: 0.5, sustain: 0.7, wave: 'sine', wet: 0.08, attack: 0.04, release: 0.2 }); }
    else for (const i of [2, 6, 10, 14]) stab(t0 + i * s16, s16 * 1.2);
  }
  // 琶音
  if (L.arp > 0.02) {
    const v = 0.07 * L.arp, notes = [cs[0] + 24, cs[1] + 24, cs[2] + 24, cs[0] + 36];
    const seq = [0, 1, 2, 3, 2, 1, 2, 1, 0, 1, 2, 3, 2, 1, 2, 3];
    for (let i = 0; i < 16; i++) S.fm(t0 + i * s16, mtof(notes[seq[i]]), s16 * 0.8, v * (i % 4 === 0 ? 1.3 : 0.8), { ratio: 1, index: 1.4, decay: 0.05, sustain: 0.15, wave: 'quarter', modWave: 'sine', wet: dry, release: 0.01, attack: 0.002 });
  }
  // 主旋律：OPL 銅管／簧風味
  if (L.lead > 0.02) {
    const v = 0.17 * L.lead;
    let i = 0;
    while (i < 8) {
      const tk = mel[i]; if (tk === '.' || tk === '-') { i++; continue; }
      let len = 1; while (i + len < 8 && mel[i + len] === '-') len++;
      const n = tr.root + degSemi(tk), t = t0 + i * e8, d = len * e8 * 0.92, f = mtof(n);
      const patch = tr.lead === 'fmBell' || tr.lead === 'organLead'
        ? { ratio: 2, index: 1.6, decay: 0.3, sustain: 0.5, wave: 'sine', modWave: 'half', vib: len > 1, wet: 0.07, release: 0.06, attack: 0.004 }
        : { ratio: 1, index: 3.4, decay: 0.16, sustain: 0.55, sustainIdx: 0.3, wave: 'half', modWave: 'sine', vib: len > 1, wet: dry, release: 0.04, attack: 0.003 };
      S.fm(t, f, d, v, patch);
      if (L.lead > 0.7) S.fm(t, f * 1.003, d, v * 0.35, { ...patch, wave: 'abs', wet: dry });
      i += len;
    }
  }
  // 鼓：AdLib 打擊模式（雜訊嘶聲 + 低音鼓）
  if (L.drums > 0.02) {
    const d = L.drums;
    for (let i = 0; i < 16; i++) {
      const t = t0 + i * s16;
      if (styl === 'march') { if (i === 0 || i === 8 || i === 10) S.kick(t, 0.5 * d); if (i === 4 || i === 12) S.snare(t, 0.3 * d); if (i % 2 === 0) S.hat(t, 0.05 * d, false); if (i === 14) S.snare(t, 0.14 * d); if (bar % 4 === 3 && i >= 12) S.snare(t, (0.12 + (i - 12) * 0.05) * d); }
      else if (styl === 'drive') { if (i % 4 === 0 || i === 10) S.kick(t, 0.55 * d); if (i === 4 || i === 12) S.snare(t, 0.34 * d); S.hat(t, (i % 2 ? 0.035 : 0.07) * d, false); if (bar % 4 === 3 && i >= 12) S.snare(t, 0.2 * d); }
      else { if (i === 0 || i === 10) S.kick(t, 0.32 * d); if (i === 8) S.snare(t, 0.16 * d); if (i % 4 === 2) S.hat(t, 0.04 * d); }
    }
    if (styl !== 'soft' && bar % 8 === 7) { S.tom(t0 + 12 * s16, 120, 0.3 * d); S.tom(t0 + 13 * s16, 100, 0.3 * d); S.tom(t0 + 14 * s16, 80, 0.35 * d); S.tom(t0 + 15 * s16, 65, 0.4 * d); }
  }
}

export function scheduleJingle(S, jn, t0) {
  const spb = 60 / jn.bpm, s = spb / 4;
  for (const [st, ch, ln] of jn.chords) for (const d of ch) {
    const n = jn.root - 12 + degSemi(d);
    S.tone(t0 + st * s, mtof(n + 12), ln * s, 0.07, 'sawtooth', { attack: 0.05, release: 0.3, filter: 1500 });
    S.tone(t0 + st * s, mtof(n), ln * s, 0.08, 'triangle', { attack: 0.02, release: 0.3 });
  }
  for (const [st, d, ln] of jn.notes) S.fm(t0 + st * s, mtof(jn.root + degSemi(d)), ln * s * 0.95, 0.2, { ratio: 1, index: 2.2, decay: 0.25, sustain: 0.55, vib: ln > 4, wet: 0.35, release: 0.2 });
  S.kick(t0, 0.5); S.tom(t0 + 0.02, 80, 0.3);
}

// ---------- 音訊引擎 ----------
export class AudioEngine {
  constructor() { this.ctx = null; this.ready = false; this.musicVol = 0.7; this.sfxVol = 0.9; this.track = null; this.inten = 0; this.target = 0; this.bar = 0; this.nextT = 0; this.gen = 0; this.lis = { x: 0, z: 0, yaw: 0 }; this.stepT = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = c.createGain(); this.master.gain.value = 0.9;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.knee.value = 18; this.comp.ratio.value = 4; this.comp.attack.value = 0.006; this.comp.release.value = 0.2;
    this.master.connect(this.comp); this.comp.connect(c.destination);
    // 殘響
    const len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.conv = c.createConvolver(); this.conv.buffer = ir;
    this.revIn = c.createGain(); this.revIn.gain.value = 1; this.revIn.connect(this.conv);
    this.mBus = c.createGain(); this.mBus.gain.value = this.musicVol; this.mBus.connect(this.master);
    this.sBus = c.createGain(); this.sBus.gain.value = this.sfxVol; this.sBus.connect(this.master);
    const rg = c.createGain(); rg.gain.value = 0.9; this.conv.connect(rg);
    this.mRev = c.createGain(); this.mRev.gain.value = 1; this.mRev.connect(this.conv); rg.connect(this.master);
    this.mSynth = new Synth(c, this.mBus, this.revIn);
    this.sSynth = new Synth(c, this.sBus, this.revIn);
    this.ready = true;
    setInterval(() => this.tick(), 40);
    if (this.pending) { const [id, i] = this.pending; this.pending = null; this.play(id, i); }
  }
  setVolumes(m, s) { this.musicVol = m; this.sfxVol = s; if (this.ready) { this.mBus.gain.value = m; this.sBus.gain.value = s; } }
  // ----- 音樂 -----
  play(id, startIntensity = 0.3) {
    if (!this.ready) { this.pending = [id, startIntensity]; return; }
    if (this.track === id) return;
    this.gen++; this.track = id; this.bar = 0; this.nextT = this.ctx.currentTime + 0.12; this.inten = startIntensity; this.target = startIntensity;
    this.mBus.gain.cancelScheduledValues(this.ctx.currentTime); this.mBus.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.mBus.gain.linearRampToValueAtTime(this.musicVol, this.ctx.currentTime + 1.2);
  }
  stop(fade = 1) {
    if (!this.ready) return; this.track = null; this.gen++;
    const t = this.ctx.currentTime; this.mBus.gain.cancelScheduledValues(t); this.mBus.gain.setValueAtTime(this.mBus.gain.value, t); this.mBus.gain.linearRampToValueAtTime(0.0001, t + fade);
  }
  jingle(id) {
    if (!this.ready) return; this.stop(0.15);
    const t = this.ctx.currentTime + 0.25;
    this.mBus.gain.cancelScheduledValues(this.ctx.currentTime); this.mBus.gain.setValueAtTime(this.musicVol, this.ctx.currentTime + 0.2);
    scheduleJingle(this.mSynth, JINGLES[id], t);
    this.track = null;
  }
  setIntensity(v) { this.target = v; }
  tick() {
    if (!this.ready || !this.track) return;
    const tr = TRACKS[this.track]; if (!tr) return;
    const spb = 60 / tr.bpm, barLen = spb * 4;
    while (this.nextT < this.ctx.currentTime + 0.35) {
      this.inten += (this.target - this.inten) * 0.35;
      const i = this.inten;
      const lay = { pad: 0.7 + 0.3 * (1 - i), bass: 0.55 + 0.45 * i, arp: 0.15 + 0.85 * i, drums: Math.max(0, (i - 0.25) / 0.75), lead: this.bar % 8 < 8 ? 0.55 + 0.45 * i : 0 };
      if (tr.drums === 'soft') lay.drums = Math.min(1, i * 1.2);
      scheduleBar(this.mSynth, tr, this.bar, this.nextT, i, lay);
      this.nextT += barLen; this.bar++;
    }
  }
  // ----- 空間 -----
  setListener(x, z, yaw) {
    this.lis.x = x; this.lis.z = z; this.lis.yaw = yaw;
    if (!this.ready) return;
    const l = this.ctx.listener, t = this.ctx.currentTime;
    const fx = Math.sin(yaw), fz = -Math.cos(yaw);
    if (l.positionX) { l.positionX.setValueAtTime(x, t); l.positionY.setValueAtTime(1.6, t); l.positionZ.setValueAtTime(z, t); l.forwardX.setValueAtTime(fx, t); l.forwardY.setValueAtTime(0, t); l.forwardZ.setValueAtTime(fz, t); l.upX.setValueAtTime(0, t); l.upY.setValueAtTime(1, t); l.upZ.setValueAtTime(0, t); }
    else { l.setPosition(x, 1.6, z); l.setOrientation(fx, 0, fz, 0, 1, 0); }
  }
  // 建立可空間化的輸出節點
  spatial(x, z, ref = 4) {
    if (x === undefined || x === null) return { node: this.sBus, wet: 0.1 };
    const c = this.ctx, p = c.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = 1.2; p.maxDistance = 80;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = 1.5; p.positionZ.value = z; } else p.setPosition(x, 1.5, z);
    p.connect(this.sBus);
    const wet = c.createGain(); wet.gain.value = 0.25; p.connect(wet); wet.connect(this.revIn);
    return { node: p, wet: 0 };
  }
  sfx(name, x, z, vol = 1) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime + 0.005, S = this.sSynth;
    const sp = this.spatial(x, z);
    // 讓 Synth 輸出到空間節點
    const dst = sp.node;
    const sy = Object.create(S); sy.dest = dst; sy.rev = x === undefined ? this.revIn : null;
    const v = vol;
    const gun = (low, crack, len, body, bright) => {
      const g = sy.noise(t, len, 0.7 * v, { type: 'lowpass', f0: bright, f1: 400, q: 0.5 }); sy.out(g, x === undefined ? 0.3 : 0);
      const g2 = sy.noise(t, 0.04, 0.5 * v * crack, { type: 'highpass', f0: 3000 }); sy.out(g2, 0);
      const o = c.createOscillator(), og = c.createGain(); o.frequency.setValueAtTime(low, t); o.frequency.exponentialRampToValueAtTime(low * 0.3, t + body);
      og.gain.setValueAtTime(0.7 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + body); o.connect(og); o.start(t); o.stop(t + body + 0.02); sy.out(og, 0);
    };
    switch (name) {
      case 'pistol': gun(170, 1, 0.18, 0.12, 9000); break;
      case 'smg': gun(150, 0.9, 0.1, 0.08, 8000); break;
      case 'shotgun': gun(90, 1.3, 0.5, 0.3, 6000); sy.noise(t + 0.01, 0.35, 0.4 * v, { type: 'bandpass', f0: 1200, f1: 300 }); break;
      case 'rifle': gun(110, 1.4, 0.4, 0.22, 10000); break;
      case 'shot_guard': gun(140, 0.8, 0.16, 0.1, 7000); break;
      case 'shot_officer': gun(200, 0.9, 0.12, 0.07, 9000); break;
      case 'shot_heavy': gun(80, 1.1, 0.4, 0.25, 5000); break;
      case 'shot_boss': gun(70, 0.9, 0.12, 0.1, 6000); break;
      case 'whiz': { const g = sy.noise(t, 0.12, 0.12 * v, { type: 'bandpass', f0: 4000, f1: 1500, q: 2 }); sy.out(g, 0); break; }
      case 'knife': { const g = sy.noise(t, 0.16, 0.3 * v, { type: 'bandpass', f0: 2500, f1: 900, q: 1.5 }); sy.out(g, 0); break; }
      case 'knife_hit': { const g = sy.noise(t, 0.12, 0.5 * v, { type: 'lowpass', f0: 1500, f1: 200 }); sy.out(g, 0); sy.tom(t, 90, 0.4 * v); break; }
      case 'empty': sy.tone(t, 900, 0.03, 0.12 * v, 'square', { wet: 0 }); sy.tone(t + 0.04, 600, 0.03, 0.1 * v, 'square', { wet: 0 }); break;
      case 'reload': { for (const [dt, f] of [[0, 500], [0.25, 800], [0.55, 650]]) { const g = sy.noise(t + dt, 0.04, 0.35 * v, { type: 'bandpass', f0: f * 3, q: 3 }); sy.out(g, 0); sy.tone(t + dt, f, 0.03, 0.08 * v, 'square', { wet: 0 }); } break; }
      case 'switch': { const g = sy.noise(t, 0.08, 0.25 * v, { type: 'bandpass', f0: 1800, f1: 900, q: 1 }); sy.out(g, 0); break; }
      case 'pump': { const g = sy.noise(t, 0.05, 0.4 * v, { type: 'bandpass', f0: 1200, q: 2 }); sy.out(g, 0); sy.tone(t + 0.12, 200, 0.06, 0.15 * v, 'square', { wet: 0 }); break; }
      case 'step': { const g = sy.noise(t, 0.07, (0.25 + Math.random() * 0.1) * v, { type: 'lowpass', f0: 700 + Math.random() * 400, f1: 150, q: 0.7 }); sy.out(g, 0.1); break; }
      case 'door_open': { const g = sy.noise(t, 0.9, 0.2 * v, { type: 'bandpass', f0: 300, f1: 120, q: 3 }); sy.out(g, 0.2); sy.tone(t, 70, 0.8, 0.12 * v, 'sawtooth', { filter: 200, wet: 0.2 }); sy.tom(t + 0.8, 60, 0.3 * v); break; }
      case 'door_close': { const g = sy.noise(t, 0.5, 0.2 * v, { type: 'bandpass', f0: 250, f1: 100, q: 3 }); sy.out(g, 0.2); sy.tom(t + 0.45, 50, 0.5 * v); break; }
      case 'locked': { sy.tone(t, 220, 0.06, 0.2 * v, 'square', { wet: 0.05 }); sy.tone(t + 0.1, 180, 0.08, 0.2 * v, 'square', { wet: 0.05 }); break; }
      case 'push': { const g = sy.noise(t, 1.4, 0.35 * v, { type: 'lowpass', f0: 400, f1: 100 }); sy.out(g, 0.3); sy.tone(t, 45, 1.4, 0.25 * v, 'sawtooth', { filter: 120, wet: 0.2 }); break; }
      case 'secret': [0, 1, 2, 3, 4].forEach((i) => sy.fm(t + i * 0.08, mtof(72 + [0, 4, 7, 12, 16][i]), 0.3, 0.14 * v, { ratio: 3.5, index: 1, decay: 0.2, wet: 0.4 })); break;
      case 'pickup': sy.fm(t, mtof(79), 0.1, 0.18 * v, { ratio: 2, index: 1.2, decay: 0.1, wet: 0.2 }); sy.fm(t + 0.07, mtof(86), 0.2, 0.18 * v, { ratio: 2, index: 1.2, decay: 0.15, wet: 0.3 }); break;
      case 'treasure': [0, 1, 2].forEach((i) => sy.fm(t + i * 0.06, mtof(84 + [0, 4, 7][i]), 0.35, 0.16 * v, { ratio: 3.5, index: 0.9, decay: 0.25, wet: 0.4 })); break;
      case 'health': [0, 1, 2].forEach((i) => sy.fm(t + i * 0.08, mtof(67 + [0, 4, 7][i]), 0.25, 0.18 * v, { ratio: 1, index: 1.2, decay: 0.2, wet: 0.3 })); break;
      case 'key': [0, 1, 2, 3].forEach((i) => sy.fm(t + i * 0.09, mtof(72 + [0, 7, 12, 19][i]), 0.4, 0.2 * v, { ratio: 3.5, index: 1.2, decay: 0.3, wet: 0.45 })); break;
      case 'weapon': sy.noise(t, 0.06, 0.3 * v, { type: 'bandpass', f0: 1500, q: 2 }); [0, 1, 2].forEach((i) => sy.fm(t + 0.05 + i * 0.07, mtof(62 + [0, 7, 12][i]), 0.25, 0.2 * v, { ratio: 1, index: 2, decay: 0.15, wet: 0.2 })); break;
      case 'hurt_player': { sy.voice(t, 260, 140, 0.25, 0.3 * v, [600, 1000]); const g = sy.noise(t, 0.12, 0.3 * v, { type: 'lowpass', f0: 900, f1: 200 }); sy.out(g, 0); break; }
      case 'die_player': sy.voice(t, 240, 60, 1.0, 0.35 * v, [600, 1000]); break;
      case 'bite': { const g = sy.noise(t, 0.1, 0.35 * v, { type: 'bandpass', f0: 1200, q: 1.5 }); sy.out(g, 0); break; }
      case 'hit': { sy.tone(t, 160, 0.06, 0.25 * v, 'square', { wet: 0 }); break; }
      case 'hitmark': sy.fm(t, mtof(88), 0.09, 0.22 * v, { ratio: 3, index: 0.8, decay: 0.07, wet: 0.05 }); break;
      case 'headshot': [0, 1].forEach((i) => sy.fm(t + i * 0.05, mtof(91 + i * 5), 0.14, 0.26 * v, { ratio: 2, index: 1.2, decay: 0.1, wet: 0.1 })); break;
      case 'killmark': [0, 1, 2].forEach((i) => sy.fm(t + i * 0.055, mtof(79 + i * 4), 0.16, 0.26 * v, { ratio: 2, index: 1.4, decay: 0.12, wet: 0.15 })); break;
      case 'ui': sy.fm(t, mtof(84), 0.08, 0.14 * v, { ratio: 2, index: 1, decay: 0.08, wet: 0.2 }); break;
      case 'ui_ok': [0, 1].forEach((i) => sy.fm(t + i * 0.07, mtof(79 + i * 7), 0.15, 0.16 * v, { ratio: 2, index: 1, decay: 0.12, wet: 0.3 })); break;
      case 'step_dog': { const g = sy.noise(t, 0.03, 0.15 * v, { type: 'lowpass', f0: 900 }); sy.out(g, 0); break; }
      default:
        if (name.startsWith('alert_')) {
          const k = name.slice(6);
          if (k === 'dog') { sy.voice(t, 320, 180, 0.14, 0.4 * v, [800, 1400]); sy.voice(t + 0.2, 300, 170, 0.14, 0.4 * v, [800, 1400]); }
          else if (k === 'boss') { sy.voice(t, 90, 55, 0.9, 0.5 * v, [500, 800]); sy.voice(t, 135, 70, 0.9, 0.3 * v, [700, 1100]); }
          else if (k === 'heavy') { sy.voice(t, 110, 80, 0.5, 0.45 * v, [550, 900]); }
          else { const f = k === 'officer' ? 170 : 140; sy.voice(t, f * 1.15, f * 0.85, 0.16, 0.4 * v, [700, 1250]); sy.voice(t + 0.19, f * 1.25, f * 0.7, 0.32, 0.4 * v, [500, 1000]); }
        } else if (name.startsWith('hurt_')) {
          const k = name.slice(5);
          if (k === 'dog') sy.voice(t, 500, 260, 0.2, 0.35 * v, [900, 1500]);
          else if (k === 'boss') sy.voice(t, 100, 70, 0.35, 0.45 * v, [500, 800]);
          else sy.voice(t, k === 'heavy' ? 130 : 180, 100, 0.22, 0.4 * v, [600, 1000]);
        } else if (name.startsWith('die_')) {
          const k = name.slice(4);
          if (k === 'dog') sy.voice(t, 600, 150, 0.5, 0.4 * v, [900, 1500]);
          else if (k === 'boss') { sy.voice(t, 120, 40, 2.0, 0.55 * v, [500, 800]); sy.tom(t + 0.8, 50, 0.5 * v); }
          else sy.voice(t, k === 'heavy' ? 140 : 210, 50, 0.7, 0.4 * v, [600, 1000]);
          sy.tom(t + 0.35, 70, 0.25 * v);
        }
    }
  }
}
