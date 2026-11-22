// The Silent Stacks — every sound is made, never loaded.
// A small WebAudio synth: filtered noise for footsteps, sine pings for
// pickups, a dissonant sting for suspicion and a harsh alarm sting.
// Nothing here runs until the player presses a key or clicks, because
// browsers refuse audio before a gesture, and every method is a no-op
// until then, so headless screenshots stay silent and error-free.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.drone = null;
  }

  // Call from a user gesture. Safe to call repeatedly; it only builds once.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startDrone();
    } catch (e) {
      this.ctx = null;
    }
  }

  // A very quiet low hum under everything, for the midnight mood.
  startDrone() {
    if (!this.ctx) return;
    const g = this.ctx.createGain();
    g.gain.value = 0.035;
    const o1 = this.ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = 55;
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = 55.7;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    o1.connect(g); o2.connect(g); g.connect(this.master);
    o1.start(); o2.start(); lfo.start();
    this.drone = { o1, o2, lfo };
  }

  // A short burst of filtered noise. pan is -1 (left) to 1 (right),
  // vol is 0..1. Wardens' steps get louder as they get closer.
  footstep(pan, vol) {
    if (!this.ctx || vol <= 0.01) return;
    const t = this.ctx.currentTime;
    const dur = 0.09;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 320;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(this.master);
    src.start(t);
  }

  // Two soft sine notes: a manuscript is yours.
  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [659.25, 987.77].forEach((freq, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.22, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.5);
      o.connect(g); g.connect(this.master);
      o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.55);
    });
  }

  // A short dissonant swell: a warden has grown suspicious.
  sting() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [220, 233.08].forEach((freq) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.75);
    });
  }

  // A harsh sawtooth burst: the alarm is up and the chase is on.
  alarm() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(392, t);
    o.frequency.exponentialRampToValueAtTime(196, t + 0.45);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1400;
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.55);
  }

  // A bright metallic tink: a coin leaves the hand.
  coin() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = 2093;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.2);
  }

  // A small rising arpeggio: the archive is yours.
  win() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.11 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.6);
      o.connect(g); g.connect(this.master);
      o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.65);
    });
  }
}
