/* =====================================================================
   docs/v3-constellation-prototypes/nebula-sound.html 의 효과음 레시피를
   실제 WAV 파일로 뽑아 docs/v3-constellation-prototypes/assets/audio/ 에 쓴다.

   시안 페이지는 브라우저 Web Audio 로 실시간 합성하므로 저장소에 소리가
   파일로 남지 않는다. 사용자가 "여기서 나온 모든 요소는 저장소에 들어가야
   한다"고 지시했으므로, 같은 레시피를 오프라인으로 렌더해 자산으로 남긴다.

   브라우저판과 다른 점은 잔향뿐이다. Web Audio 는 ConvolverNode 를 쓰지만
   여기서는 Node 내장 모듈만 쓰기로 되어 있어 콤/올패스 기반 잔향으로 대체했다.
   음색과 길이는 같고 공간의 결만 조금 다르다.

   실행: node tools/render-nebula-audio.js
   ===================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const SR = 22050;                 // 성격 확인용이므로 대역폭보다 용량을 택했다
const OUT = path.join(__dirname, '..', 'docs', 'v3-constellation-prototypes', 'assets', 'audio');

/* ---------------------------------------------------------------------
   버퍼와 WAV 쓰기
   --------------------------------------------------------------------- */
function makeBuf(seconds) {
  const n = Math.ceil(SR * seconds);
  return { n, L: new Float32Array(n), R: new Float32Array(n) };
}

function writeWav(file, buf, stereo) {
  const ch = stereo ? 2 : 1;
  const frames = buf.n;
  const dataBytes = frames * ch * 2;
  const out = Buffer.alloc(44 + dataBytes);

  out.write('RIFF', 0);
  out.writeUInt32LE(36 + dataBytes, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);            // PCM
  out.writeUInt16LE(ch, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * ch * 2, 28);
  out.writeUInt16LE(ch * 2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  out.writeUInt32LE(dataBytes, 40);

  let p = 44;
  for (let i = 0; i < frames; i++) {
    const l = Math.max(-1, Math.min(1, buf.L[i]));
    out.writeInt16LE(Math.round(l * 32767), p); p += 2;
    if (stereo) {
      const r = Math.max(-1, Math.min(1, buf.R[i]));
      out.writeInt16LE(Math.round(r * 32767), p); p += 2;
    }
  }
  fs.writeFileSync(file, out);
  return dataBytes + 44;
}

/* ---------------------------------------------------------------------
   기본 처리기
   --------------------------------------------------------------------- */

/* 지수 감쇠 포락선. Web Audio 의 exponentialRampToValueAtTime 과 같은 모양이다. */
function envAt(t, dur, peak, attack) {
  if (t < 0 || t > dur) return 0;
  if (t < attack) return peak * Math.pow(t / Math.max(attack, 1e-5), 1.6);
  const k = (t - attack) / Math.max(dur - attack, 1e-5);
  return peak * Math.pow(1e-4, k);
}

/* 2차 필터. 잡음을 걸러 공기음·몸통·저역을 만든다. */
function biquad(type, freq, q) {
  const w = 2 * Math.PI * Math.min(freq, SR * 0.45) / SR;
  const cs = Math.cos(w), sn = Math.sin(w);
  const alpha = sn / (2 * Math.max(q, 0.05));
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass') {
    b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2;
    a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
  } else {                                   // bandpass
    b0 = alpha; b1 = 0; b2 = -alpha;
    a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/* 콤 + 올패스 잔향. ConvolverNode 대신 쓰는 대체물이다. */
function reverb(buf) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({
    d: Math.round(d * SR / 44100), buf: null, i: 0, fb: 0.83, damp: 0.28, store: 0,
  }));
  const allpass = [556, 441].map((d) => ({
    d: Math.round(d * SR / 44100), buf: null, i: 0, fb: 0.5,
  }));
  combs.forEach((c) => { c.buf = new Float32Array(c.d); });
  allpass.forEach((a) => { a.buf = new Float32Array(a.d); });

  const out = new Float32Array(buf.length);
  for (let n = 0; n < buf.length; n++) {
    const x = buf[n] * 0.28;
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.store = y * (1 - c.damp) + c.store * c.damp;
      c.buf[c.i] = x + c.store * c.fb;
      c.i = (c.i + 1) % c.d;
      acc += y;
    }
    for (const a of allpass) {
      const y = a.buf[a.i];
      const v = acc + y * a.fb;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.d;
      acc = y - v * a.fb;
    }
    out[n] = acc;
  }
  return out;
}

/* ---------------------------------------------------------------------
   렌더 컨텍스트 — 드라이와 웨트를 따로 모았다가 마지막에 섞는다.
   --------------------------------------------------------------------- */
function newCtx(seconds) {
  const n = Math.ceil(SR * seconds);
  return {
    n,
    dryL: new Float32Array(n), dryR: new Float32Array(n),
    wetL: new Float32Array(n), wetR: new Float32Array(n),
  };
}

/* 한 샘플을 드라이·웨트에 좌우 비율대로 더한다. */
function add(ctx, i, v, wet, pan) {
  if (i < 0 || i >= ctx.n) return;
  const p = pan === undefined ? 0 : Math.max(-1, Math.min(1, pan));
  const gl = Math.cos((p + 1) * Math.PI / 4);
  const gr = Math.sin((p + 1) * Math.PI / 4);
  ctx.dryL[i] += v * gl;
  ctx.dryR[i] += v * gr;
  if (wet > 0) {
    ctx.wetL[i] += v * gl * wet;
    ctx.wetR[i] += v * gr * wet;
  }
}

function panAt(o, t, dur) {
  if (o.pan === undefined && o.panTo === undefined) return 0;
  const from = o.pan === undefined ? 0 : o.pan;
  if (o.panTo === undefined) return from;
  const span = o.panDur === undefined ? dur : o.panDur;
  return from + (o.panTo - from) * Math.max(0, Math.min(1, t / Math.max(span, 1e-5)));
}

/* ---------------------------------------------------------------------
   악기 — nebula-sound.html 의 함수와 같은 규칙을 따른다.
   --------------------------------------------------------------------- */

/* 종. 실제 종의 배음은 정수배가 아니며, 이 비율이 종답게 들리는 핵심이다. */
function bell(ctx, at, freq, o) {
  o = o || {};
  const dur = o.dur || 1.6;
  const gain = o.gain === undefined ? 0.13 : o.gain;
  const wet = o.wet === undefined ? 0.55 : o.wet;
  const ratios = o.ratios || [1, 2.0, 2.76, 5.4, 8.93];
  ratios.forEach((r, k) => {
    const f = freq * r;
    if (f > SR * 0.45) return;
    const life = dur * Math.pow(0.62, k) * (k ? 1 : 1.25);
    const amp = gain * Math.pow(0.52, k);
    const start = Math.round(at * SR);
    const len = Math.ceil(life * SR);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const v = Math.sin(2 * Math.PI * f * t) * envAt(t, life, amp, 0.004);
      add(ctx, start + i, v, wet, panAt(o, t, life));
    }
  });
}

/* 두드린 소리. 종보다 배음이 조화롭고 때리는 순간의 몸통 잡음이 섞인다. */
function mallet(ctx, at, freq, o) {
  o = o || {};
  const dur = o.dur || 0.5;
  const gain = o.gain === undefined ? 0.16 : o.gain;
  const wet = o.wet === undefined ? 0.35 : o.wet;
  [1, 3.01, 6.02].forEach((r, k) => {
    const f = freq * r;
    if (f > SR * 0.45) return;
    const life = dur * Math.pow(0.45, k);
    const amp = gain * Math.pow(0.34, k);
    const start = Math.round(at * SR);
    const len = Math.ceil(life * SR);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const v = Math.sin(2 * Math.PI * f * t) * envAt(t, life, amp, 0.003);
      add(ctx, start + i, v, wet, panAt(o, t, life));
    }
  });
  burst(ctx, at, { from: freq * 2.6, dur: 0.04, gain: gain * 0.5, q: 1.4, wet: wet * 0.85, pan: o.pan });
}

/* 미세하게 어긋난 여러 겹. 그 어긋남이 두께를 만든다. */
function pad(ctx, at, freqs, o) {
  o = o || {};
  const dur = o.dur || 3;
  const gain = o.gain === undefined ? 0.05 : o.gain;
  const wet = o.wet === undefined ? 0.7 : o.wet;
  const attack = o.attack === undefined ? dur * 0.28 : o.attack;
  const start = Math.round(at * SR);
  const len = Math.ceil(dur * SR);
  const shape = o.type || 'triangle';

  freqs.forEach((base) => {
    [-7, 0, 7].forEach((cent, k) => {
      const f = base * Math.pow(2, cent / 1200);
      const amp = gain * (k === 1 ? 1 : 0.6);
      /* 로우패스가 서서히 열리며 소리가 앞으로 나온다. */
      let z1 = 0, z2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        const ph = 2 * Math.PI * f * t;
        let raw;
        if (shape === 'sawtooth') raw = 2 * ((f * t) % 1) - 1;
        else raw = 2 * Math.abs(2 * ((f * t) % 1) - 1) - 1;   // triangle
        const cut = 400 + (2200 - 400) * Math.min(1, t / (dur * 0.55));
        const c = biquad('lowpass', cut, 0.7);
        const y = c.b0 * raw + c.b1 * z1 + c.b2 * z2 - c.a1 * y1 - c.a2 * y2;
        z2 = z1; z1 = raw; y2 = y1; y1 = y;
        add(ctx, start + i, y * envAt(t, dur, amp, attack), wet, 0);
      }
    });
  });
}

/* 걸러진 잡음 한 덩어리. 공기음·몸통·천둥에 두루 쓴다. */
function burst(ctx, at, o) {
  o = o || {};
  const dur = o.dur || 0.4;
  const gain = o.gain === undefined ? 0.09 : o.gain;
  const wet = o.wet === undefined ? 0.5 : o.wet;
  const q = o.q === undefined ? 1.1 : o.q;
  const type = o.type || 'bandpass';
  const attack = o.attack || 0.02;
  const start = Math.round(at * SR);
  const len = Math.ceil(dur * SR);

  let z1 = 0, z2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const k = t / Math.max(dur, 1e-5);
    const f = o.to ? (o.from || 600) * Math.pow(o.to / (o.from || 600), k) : (o.from || 600);
    const c = biquad(type, f, q);
    const raw = Math.random() * 2 - 1;
    const y = c.b0 * raw + c.b1 * z1 + c.b2 * z2 - c.a1 * y1 - c.a2 * y2;
    z2 = z1; z1 = raw; y2 = y1; y1 = y;
    add(ctx, start + i, y * envAt(t, dur, gain, attack), wet, panAt(o, t, dur));
  }
}

/* 저역 울림. 반드시 중역 몸통과 함께 쓴다.
   서브만 있으면 진폭이 커도 귀에는 거의 들리지 않는다. */
function boom(ctx, at, o) {
  o = o || {};
  const dur = o.dur || 1.2;
  const gain = o.gain === undefined ? 0.22 : o.gain;
  const wet = o.wet === undefined ? 0.8 : o.wet;
  const f0 = o.freq || 70, f1 = o.to || 34;
  const start = Math.round(at * SR);
  const len = Math.ceil(dur * SR);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const k = Math.min(1, t / (dur * 0.8));
    const f = f0 * Math.pow(f1 / f0, k);
    phase += 2 * Math.PI * f / SR;
    add(ctx, start + i, Math.sin(phase) * envAt(t, dur, gain, o.attack || 0.012), wet, 0);
  }
  if (o.body !== false) {
    burst(ctx, at, { from: 620, to: 190, dur: dur * 0.45, q: 1.1, gain: gain * 0.55, attack: 0.01, wet: wet * 0.8 });
    burst(ctx, at, { from: 240, to: 70, dur: dur * 0.8, type: 'lowpass', q: 0.6, gain: gain * 0.6, attack: 0.02, wet });
  }
}

/* 음정이 움직이는 한 음. 글라이드와 비브라토를 함께 쓸 수 있다. */
function glide(ctx, at, o) {
  const dur = o.dur || 0.4;
  const gain = o.gain === undefined ? 0.12 : o.gain;
  const wet = o.wet === undefined ? 0.45 : o.wet;
  const shape = o.type || 'sine';
  const start = Math.round(at * SR);
  const len = Math.ceil(dur * SR);
  let phase = 0, hphase = 0;

  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const k = t / Math.max(dur, 1e-5);
    let f = o.to ? o.from * Math.pow(o.to / o.from, k) : o.from;
    if (o.vib) {
      const rate = o.vibTo ? o.vib + (o.vibTo - o.vib) * k : o.vib;
      f += o.from * (o.vibDepth || 0.022) * Math.sin(2 * Math.PI * rate * t);
    }
    phase += 2 * Math.PI * f / SR;
    let raw;
    if (shape === 'sawtooth') raw = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
    else if (shape === 'square') raw = Math.sin(phase) >= 0 ? 1 : -1;
    else if (shape === 'triangle') raw = 2 * Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) - 1;
    else raw = Math.sin(phase);
    const p = panAt(o, t, dur);
    add(ctx, start + i, raw * envAt(t, dur, gain, o.attack || 0.006), wet, p);

    /* 배음을 하나 얹어 맨 사인파를 면한다. */
    if (o.harm !== false && t < dur * 0.6) {
      hphase += 2 * Math.PI * f * 2 / SR;
      add(ctx, start + i, Math.sin(hphase) * envAt(t, dur * 0.6, gain * 0.26, o.attack || 0.006), wet, p);
    }
  }
}

/* 물방울 — 짧은 상승 글라이드에 몸통을 붙인 것. */
function drop(ctx, at, f) {
  glide(ctx, at, { from: f * 0.62, to: f, dur: 0.14, gain: 0.1, wet: 0.5 });
  burst(ctx, at, { from: f * 3, to: f * 1.4, dur: 0.06, q: 2.6, gain: 0.04, wet: 0.45 });
}

/* ---------------------------------------------------------------------
   상황별 레시피 — nebula-sound.html 의 CUES 와 같은 값을 쓴다.
   --------------------------------------------------------------------- */
const CUES = {
  s1a: (c) => bell(c, 0, 1174.66, { dur: 1.9, gain: .11, wet: .62 }),
  s1b: (c) => { mallet(c, 0, 1046.5, { dur: 1.1, gain: .13, wet: .55 });
                bell(c, 0, 2093, { dur: .5, gain: .03, wet: .5 }); },
  s1c: (c) => { burst(c, 0, { from: 2600, to: 900, dur: .05, gain: .05, q: 2, wet: .4 });
                bell(c, 0, 1567.98, { dur: 1.5, gain: .085, ratios: [1, 2, 3, 4.2], wet: .6 }); },

  s2a: (c) => { burst(c, 0, { from: 480, to: 1900, dur: .42, q: .9, gain: .06, attack: .14, wet: .55 });
                glide(c, .04, { from: 520, to: 880, dur: .34, gain: .035, attack: .12, wet: .55 }); },
  s2b: (c) => { glide(c, 0, { from: 293.66, to: 440, dur: .45, type: 'sawtooth', gain: .045, attack: .16, wet: .5, harm: false });
                burst(c, 0, { from: 1400, to: 2600, dur: .3, q: 2.2, gain: .028, attack: .12, wet: .5 }); },

  s3a: (c) => { pad(c, 0, [261.63, 329.63, 392, 523.25], { dur: 2.6, gain: .045, attack: .55, wet: .85 });
                bell(c, .5, 1046.5, { dur: 1.6, gain: .05, wet: .7 }); },
  s3b: (c) => [523.25, 659.25, 783.99].forEach((f, i) =>
                bell(c, i * .14, f, { dur: 2.0 - i * .2, gain: .095 - i * .012, wet: .68 })),
  s3c: (c) => { pad(c, 0, [130.81, 196], { dur: 2.4, gain: .05, attack: .4, type: 'sawtooth', wet: .8 });
                bell(c, .35, 1318.51, { dur: 2.0, gain: .085, wet: .72 }); },

  s4a: (c) => mallet(c, 0, 261.63, { dur: .26, gain: .17, wet: .22 }),
  s4b: (c) => bell(c, 0, 196, { dur: .95, gain: .085, wet: .45 }),

  s5a: (c) => bell(c, 0, 783.99, { dur: .75, gain: .085, wet: .4 }),
  s5b: (c) => mallet(c, 0, 587.33, { dur: .38, gain: .13, wet: .3 }),

  s6a: (c) => { bell(c, 0, 659.25, { dur: .5, gain: .08, wet: .45 });
                bell(c, .075, 987.77, { dur: .9, gain: .075, wet: .5 }); },
  s6b: (c) => [523.25, 659.25, 987.77].forEach((f, i) =>
                bell(c, i * .065, f, { dur: i === 2 ? 1.3 : .45, gain: .075, wet: .5 })),
  s6c: (c) => { bell(c, 0, 659.25, { dur: .5, gain: .075, wet: .45 });
                bell(c, .07, 987.77, { dur: 1.0, gain: .07, wet: .5 });
                burst(c, .10, { from: 700, to: 2400, dur: .5, q: .8, gain: .04, attack: .18, wet: .6 }); },

  s7a: (c) => { burst(c, 0, { from: 140, to: 900, dur: .85, type: 'lowpass', q: .8, gain: .085, attack: .6, wet: .7 });
                glide(c, .1, { from: 87.31, to: 130.81, dur: .8, gain: .07, attack: .5, wet: .7, harm: false }); },
  s7b: (c) => { glide(c, 0, { from: 110, dur: .9, gain: .075, attack: .3, wet: .65, vib: 3.2, vibDepth: .05, harm: false });
                burst(c, 0, { from: 260, to: 520, dur: .9, q: 3.4, gain: .05, attack: .35, wet: .7 }); },
  s7c: (c) => { burst(c, 0, { from: 420, to: 1500, dur: .95, q: .7, gain: .055, attack: .68, wet: .75 });
                glide(c, .2, { from: 174.61, to: 261.63, dur: .7, gain: .035, attack: .45, wet: .7 }); },

  s8a: (c) => boom(c, 0, { freq: 78, to: 30, dur: 1.5, gain: .17, wet: .95 }),
  s8b: (c) => { boom(c, 0, { freq: 62, to: 34, dur: 1.7, gain: .11, wet: .95 });
                [0, .18, .42, .7].forEach((d, i) =>
                  burst(c, d, { from: 180 - i * 25, to: 55, dur: .5, type: 'lowpass', q: .5,
                                gain: .07 - i * .012, attack: .06, wet: .9 })); },
  s8c: (c) => { burst(c, 0, { from: 120, to: 45, dur: 1.6, type: 'lowpass', q: .5, gain: .07, attack: .5, wet: 1 });
                glide(c, .1, { from: 55, to: 41, dur: 1.5, gain: .055, attack: .45, wet: 1, harm: false }); },

  s9a: (c) => glide(c, 0, { from: 392, dur: .8, gain: .085, vib: 5.5, wet: .6 }),
  s9b: (c) => { glide(c, 0, { from: 330, to: 415, dur: .55, gain: .085, vib: 4, wet: .55 });
                glide(c, .5, { from: 415, to: 262, dur: .7, gain: .05, vib: 3, wet: .8 }); },
  s9c: (c) => glide(c, 0, { from: 392, to: 330, dur: 1.3, gain: .085, vib: 7, vibTo: 1.6, wet: .8 }),

  s10a: (c) => { glide(c, 0, { from: 73.42, to: 55, dur: 1.0, type: 'sawtooth', gain: .06, attack: .06, wet: .7, harm: false });
                 burst(c, .08, { from: 420, to: 130, dur: .8, q: 3.4, gain: .055, attack: .07, wet: .8 });
                 bell(c, 1.15, 146.83, { dur: 1.4, gain: .07, wet: .9 }); },
  s10b: (c) => { [0, .09, .21, .34].forEach((d, i) =>
                   burst(c, d, { from: 900 - i * 150, to: 260, dur: .28, q: 6 + i, gain: .05, attack: .01, wet: .55 }));
                 boom(c, .3, { freq: 58, to: 38, dur: 1.3, gain: .12, wet: .9 }); },
  s10c: (c) => { glide(c, 0, { from: 65.41, to: 49, dur: 1.1, type: 'sawtooth', gain: .055, attack: .08, wet: .7, harm: false });
                 [0, .16, .32].forEach((d, i) =>
                   bell(c, 1.0 + d, 880 + i * 110, { dur: .8, gain: .035, ratios: [1, 2, 3], wet: 1 })); },

  s11a: (c) => { bell(c, 0, 523.25, { dur: 2.2, gain: .075, wet: .8 });
                 bell(c, .1, 783.99, { dur: 2.0, gain: .06, wet: .8 });
                 bell(c, .68, 622.25, { dur: 1.9, gain: .07, wet: .85 }); },
  s11b: (c) => { bell(c, 0, 293.66, { dur: 3.2, gain: .085, ratios: [1, 2.4, 3.9, 5.8], wet: .95 });
                 bell(c, .5, 440, { dur: 2.6, gain: .05, ratios: [1, 2.4, 3.9], wet: .95 }); },
  s11c: (c) => { for (let i = 0; i < 12; i++)
                   bell(c, i * .045, 440 * Math.pow(2, i / 12), { dur: .3, gain: .028, wet: .6 });
                 bell(c, .72, 622.25, { dur: 2.4, gain: .08, wet: .95 }); },

  s12a: (c) => { drop(c, 0, 660); drop(c, .19, 494); },
  s12b: (c) => { drop(c, 0, 660); drop(c, .17, 587); drop(c, .36, 392); },
  s12c: (c) => { mallet(c, 0, 523.25, { dur: .3, gain: .12, wet: .35 });
                 mallet(c, .18, 392, { dur: .38, gain: .10, wet: .4 }); },

  s13a: (c) => { glide(c, 0, { from: 392, to: 49, dur: 1.9, gain: .10, attack: .12, wet: .9, harm: false });
                 burst(c, 0, { from: 1800, to: 70, dur: 1.8, type: 'lowpass', q: .6, gain: .05, attack: .2, wet: .9 }); },
  s13b: (c) => { pad(c, 0, [261.63, 392], { dur: .5, gain: .06, attack: .05, wet: .3 });
                 glide(c, 1.1, { from: 65.41, dur: 1.9, gain: .09, attack: .5, wet: 1, harm: false }); },
  s13c: (c) => { pad(c, 0, [130.81, 196, 261.63], { dur: 2.2, gain: .05, attack: .15, wet: .85 });
                 burst(c, 0, { from: 4200, to: 120, dur: 2.1, type: 'lowpass', q: .7, gain: .045, attack: .1, wet: .85 }); },

  m1a: (c) => {
    [1046.5, 1318.51, 1567.98, 1975.53].forEach((f, i) => bell(c, i * .34, f, { dur: 2.2, gain: .07, wet: .7 }));
    pad(c, 2.0, [261.63, 329.63, 392], { dur: 5.6, gain: .04, attack: 1.3, wet: .9 });
    bell(c, 4.6, 659.25, { dur: 2.4, gain: .045, wet: .8 });
    pad(c, 7.0, [261.63, 392, 523.25, 659.25], { dur: 4.0, gain: .05, attack: .8, wet: .95 });
  },
  m1b: (c) => {
    [523.25, 659.25].forEach((f, i) => mallet(c, i * .5, f, { dur: 2.4, gain: .085, wet: .8 }));
    [392, 523.25, 466.16].forEach((f, i) => mallet(c, 2.2 + i * .75, f, { dur: 2.6, gain: .075, wet: .85 }));
    pad(c, 3.4, [174.61, 261.63], { dur: 4.6, gain: .035, attack: 1.6, wet: .95 });
    [523.25, 659.25, 783.99].forEach((f, i) => mallet(c, 7.2 + i * .28, f, { dur: 3.6, gain: .07, wet: .95 }));
  },
  m1c: (c) => {
    [1567.98, 1318.51, 1046.5, 1318.51].forEach((f, i) => bell(c, i * .42, f, { dur: 2.6, gain: .075, wet: .9 }));
    [783.99, 1046.5].forEach((f, i) => bell(c, 2.6 + i * .8, f, { dur: 3.0, gain: .06, wet: .95 }));
    bell(c, 5.4, 622.25, { dur: 3.4, gain: .055, wet: 1 });
    [523.25, 783.99, 1046.5].forEach((f, i) => bell(c, 7.4 + i * .2, f, { dur: 3.6, gain: .065, wet: 1 }));
  },
};

/* 파일 이름은 상황을 알아볼 수 있게 짓는다. 기호만으로는 나중에 못 찾는다. */
const NAMES = {
  s1a: 'sfx-01-star-a-glass-bell',   s1b: 'sfx-01-star-b-celesta',      s1c: 'sfx-01-star-c-harp',
  s2a: 'sfx-02-link-a-breath',       s2b: 'sfx-02-link-b-bowed',
  s3a: 'sfx-03-complete-a-pad',      s3b: 'sfx-03-complete-b-arpeggio',  s3c: 'sfx-03-complete-c-low-and-bell',
  s4a: 'sfx-04-year-a-wood',         s4b: 'sfx-04-year-b-low-bell',
  s5a: 'sfx-05-select-a-bell',       s5b: 'sfx-05-select-b-marimba',
  s6a: 'sfx-06-enter-a-two-notes',   s6b: 'sfx-06-enter-b-three-notes',  s6c: 'sfx-06-enter-c-with-air',
  s7a: 'sfx-07-protostar-a-reverse', s7b: 'sfx-07-protostar-b-rotating', s7c: 'sfx-07-protostar-c-breath',
  s8a: 'sfx-08-remnant-a-far-boom',  s8b: 'sfx-08-remnant-b-thunder',    s8c: 'sfx-08-remnant-c-tail-only',
  s9a: 'sfx-09-drift-a-wobble',      s9b: 'sfx-09-drift-b-passing',      s9c: 'sfx-09-drift-c-fading',
  s10a: 'sfx-10-area51-a-split',     s10b: 'sfx-10-area51-b-scrape',     s10c: 'sfx-10-area51-c-signal',
  s11a: 'sfx-11-ophiuchus-a-intrude', s11b: 'sfx-11-ophiuchus-b-bowl',   s11c: 'sfx-11-ophiuchus-c-twelve',
  s12a: 'sfx-12-capybara-a-two-drops', s12b: 'sfx-12-capybara-b-three-drops', s12c: 'sfx-12-capybara-c-wood',
  s13a: 'sfx-13-eclipse-a-descend',  s13b: 'sfx-13-eclipse-b-silence',   s13c: 'sfx-13-eclipse-c-highs-first',
  m1a: 'mus-01-a-bell-pad-chord',    m1b: 'mus-01-b-piano',              m1c: 'mus-01-c-bells-only',
};

/* 큐마다 필요한 길이. 잔향이 사라질 여유를 뒤에 둔다. */
const LENGTH = {
  s1a: 2.6, s1b: 2.0, s1c: 2.4, s2a: 1.6, s2b: 1.6,
  s3a: 4.2, s3b: 3.4, s3c: 4.0, s4a: 1.4, s4b: 2.2,
  s5a: 2.0, s5b: 1.6, s6a: 2.4, s6b: 2.6, s6c: 2.6,
  s7a: 2.4, s7b: 2.4, s7c: 2.4, s8a: 3.4, s8b: 3.6, s8c: 3.4,
  s9a: 2.4, s9b: 2.8, s9c: 3.0, s10a: 4.0, s10b: 3.4, s10c: 3.8,
  s11a: 4.4, s11b: 5.2, s11c: 4.6, s12a: 1.8, s12b: 2.0, s12c: 1.8,
  s13a: 3.6, s13b: 4.2, s13c: 3.8, m1a: 12.0, m1b: 12.0, m1c: 12.0,
};

/* 좌우로 실제 이동하는 큐만 스테레오로 남긴다. 나머지는 모노로 용량을 아낀다. */
const STEREO = new Set([]);

function render(key) {
  const seconds = LENGTH[key] || 2;
  const ctx = newCtx(seconds);
  CUES[key](ctx);

  const wetL = reverb(ctx.wetL);
  const wetR = reverb(ctx.wetR);
  const stereo = STEREO.has(key);
  const buf = makeBuf(seconds);
  let peak = 0;
  for (let i = 0; i < ctx.n; i++) {
    buf.L[i] = ctx.dryL[i] * 0.85 + wetL[i] * 0.9;
    buf.R[i] = ctx.dryR[i] * 0.85 + wetR[i] * 0.9;
    if (!stereo) { const m = (buf.L[i] + buf.R[i]) * 0.5; buf.L[i] = m; buf.R[i] = m; }
    peak = Math.max(peak, Math.abs(buf.L[i]), Math.abs(buf.R[i]));
  }
  /* 큐마다 크기가 들쭉날쭉하면 비교가 안 된다. 최대치를 맞춰 둔다. */
  if (peak > 0) {
    const k = 0.82 / peak;
    for (let i = 0; i < ctx.n; i++) { buf.L[i] *= k; buf.R[i] *= k; }
  }
  const file = path.join(OUT, `${NAMES[key]}.wav`);
  const bytes = writeWav(file, buf, stereo);
  return { file: path.basename(file), bytes };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const keys = Object.keys(CUES);
  let total = 0;
  for (const key of keys) {
    const r = render(key);
    total += r.bytes;
    process.stdout.write(`${r.file}  ${(r.bytes / 1024).toFixed(0)}KB\n`);
  }
  process.stdout.write(`\n${keys.length} files, ${(total / 1024 / 1024).toFixed(2)}MB\n`);
}

main();
