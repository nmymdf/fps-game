import { TRACKS, JINGLES, scheduleBar, scheduleJingle, Synth } from './audio.js';
window.renderTrack = async (id, bars, inten, jingle) => {
  const sr = 22050; const tr = jingle ? null : TRACKS[id]; const jn = jingle ? JINGLES[id] : null;
  const dur = jingle ? 8 : bars * 4 * 60 / tr.bpm + 2;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
  const master = ctx.createGain(); master.gain.value = 0.8; const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
  const len = sr * 2, ir = ctx.createBuffer(2, len, sr); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  const conv = ctx.createConvolver(); conv.buffer = ir; const rg = ctx.createGain(); rg.gain.value = 0.9; conv.connect(rg); rg.connect(master);
  const bus = ctx.createGain(); bus.gain.value = 0.56; bus.connect(master); const revIn = ctx.createGain(); revIn.connect(conv);
  const S = new Synth(ctx, bus, revIn);
  if (jingle) scheduleJingle(S, jn, 0.1);
  else for (let b = 0; b < bars; b++) { const i = inten; scheduleBar(S, tr, b, 0.1 + b * 4 * 60 / tr.bpm, i, { pad: 0.7 + 0.3 * (1 - i), bass: 0.55 + 0.45 * i, arp: 0.15 + 0.85 * i, drums: Math.max(0, (i - 0.25) / 0.75), lead: 0.55 + 0.45 * i }); }
  const buf = await ctx.startRendering();
  const d = buf.getChannelData(0); let peak = 0, sum = 0, nan = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; if (v !== v) nan++; peak = Math.max(peak, Math.abs(v)); sum += v * v; }
  // return downsampled wav as base64 for optional export
  const pcm = new Int16Array(d.length); for (let i = 0; i < d.length; i++) pcm[i] = Math.max(-1, Math.min(1, d[i])) * 32767;
  let bin = ''; const u8 = new Uint8Array(pcm.buffer); for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return { peak, rms: Math.sqrt(sum / d.length), nan, dur: buf.duration, pcm: btoa(bin), sr };
};
window.__ready = true;
