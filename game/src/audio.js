// The Silent Stacks — procedural sound.
//
// No audio files: every sound is synthesized with the Web Audio API, so the
// game loads nothing over the network. The audio context is created on the
// first user gesture (the start button), which browsers require.
//
// Sounds: the thief's soft steps, a warden's heavier steps (panned and
// quieted by distance, so footsteps tell you where a warden is), the rising
// sting when a warden grows suspicious, the alarm when you are spotted, the
// chime of a stolen manuscript, the clink of a tossed coin, and the quiet
// drone of the archive at night.

const audio = {
  ctx: null,
  master: null,
  drone: null,
  stepTimer: 0,
};

function audioInit() {
  if (audio.ctx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audio.ctx = new Ctx();
  audio.master = audio.ctx.createGain();
  audio.master.gain.value = 0.5;
  audio.master.connect(audio.ctx.destination);
  audioStartDrone();
}

function audioTone(freq, seconds, type, volume, when) {
  if (!audio.ctx) return;
  const t0 = audio.ctx.currentTime + (when || 0);
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.05);
}

function audioStartDrone() {
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 55;
  gain.gain.value = 0.035;
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start();
  audio.drone = osc;
  // A slow second voice, a fifth above, so the room feels alive.
  const osc2 = audio.ctx.createOscillator();
  const gain2 = audio.ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.value = 82.5;
  gain2.gain.value = 0.012;
  osc2.connect(gain2);
  gain2.connect(audio.master);
  osc2.start();
}

// A short filtered-noise tick: a footstep. `loud` 0..1, `pan` -1..1.
function audioFootstep(loud, pan) {
  if (!audio.ctx) return;
  const t0 = audio.ctx.currentTime;
  const dur = 0.07;
  const buffer = audio.ctx.createBuffer(1, audio.ctx.sampleRate * dur, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = audio.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  const gain = audio.ctx.createGain();
  gain.gain.value = 0.25 * loud;
  const panner = audio.ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  src.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(audio.master);
  src.start(t0);
}

function audioCoinClink() {
  audioTone(2093, 0.12, 'sine', 0.12);
  audioTone(2637, 0.18, 'sine', 0.10, 0.07);
}

function audioPickup() {
  audioTone(523, 0.14, 'sine', 0.14);
  audioTone(659, 0.14, 'sine', 0.14, 0.09);
  audioTone(784, 0.22, 'sine', 0.14, 0.18);
}

function audioSuspicious() {
  audioTone(330, 0.25, 'triangle', 0.12);
  audioTone(392, 0.35, 'triangle', 0.12, 0.12);
}

function audioAlarm() {
  audioTone(220, 0.3, 'sawtooth', 0.10);
  audioTone(311, 0.3, 'sawtooth', 0.10, 0.15);
  audioTone(440, 0.4, 'sawtooth', 0.10, 0.30);
}

function audioCaught() {
  audioTone(196, 0.4, 'sawtooth', 0.12);
  audioTone(147, 0.6, 'sawtooth', 0.12, 0.2);
}

function audioLevelClear() {
  audioTone(523, 0.16, 'sine', 0.13);
  audioTone(659, 0.16, 'sine', 0.13, 0.12);
  audioTone(784, 0.16, 'sine', 0.13, 0.24);
  audioTone(1047, 0.3, 'sine', 0.13, 0.36);
}
