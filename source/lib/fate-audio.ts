export type GroundSound = 'wood' | 'stone' | 'tatami';
export type AmbientSound = 'outdoor' | 'shop' | 'home';
export function roomAcoustics(
  name: string,
  room: string,
): { ambient: AmbientSound; ground: GroundSound } {
  if (/庭院|庭前|前庭|院落|缘侧|engawa|forecourt|garden/.test(room))
    return {
      ambient: 'outdoor',
      ground: /缘侧|engawa/.test(room) ? 'wood' : 'stone',
    };
  return {
    ambient: /店|铺|商/.test(name) ? 'shop' : 'home',
    ground: /和室|榻榻米|大殿|道场|弓道/.test(room)
      ? 'tatami'
      : /教会|教堂/.test(name)
        ? 'stone'
        : 'wood',
  };
}

export class FootstepClock {
  private distance = 0;
  advance(distance: number) {
    if (!Number.isFinite(distance) || distance <= 0 || distance > 250) return 0;
    this.distance += distance;
    const count = Math.min(2, Math.floor(this.distance / 96));
    this.distance %= 96;
    return count;
  }
  reset() {
    this.distance = 0;
  }
}

type Scene = { key: string; ambient: AmbientSound };
/** Local synthesis only. No audio is constructed or played before the user enables sound. */
class FateAudio {
  enabled = false;
  state: 'muted' | 'playing' | 'paused' | 'blocked' = 'muted';
  private initialized = false;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: { source: AudioBufferSourceNode; gain: GainNode } | null =
    null;
  private noise: AudioBuffer | null = null;
  private listeners = new Set<() => void>();
  private scenes = new Map<symbol, Scene>();
  private last: Scene | null = null;
  private lastDoorScene: Scene | null = null;
  private birds: ReturnType<typeof setInterval> | null = null;
  private clock = new FootstepClock();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private notify() {
    for (const listener of this.listeners) listener();
  }
  initialize() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    try {
      this.enabled = localStorage.getItem('sinefine.sound.v1') === 'on';
    } catch {
      /* Storage can be disabled. */
    }
    if (this.enabled) this.state = 'paused';
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        void this.context?.suspend();
        this.state = this.enabled ? 'paused' : 'muted';
      } else if (this.enabled && this.context)
        void this.context
          .resume()
          .then(() => {
            this.state = 'playing';
            this.notify();
          })
          .catch(() => {
            this.state = 'blocked';
            this.notify();
          });
      this.notify();
    });
    window.addEventListener(
      'pointerdown',
      () => {
        if (this.enabled && (!this.context || this.context.state !== 'running'))
          void this.enable();
      },
      { passive: true },
    );
    this.notify();
  }
  private async enable() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.context.destination);
        this.noise = this.context.createBuffer(
          1,
          this.context.sampleRate * 2,
          this.context.sampleRate,
        );
        const data = this.noise.getChannelData(0);
        let seed = 127;
        for (let i = 0; i < data.length; i++) {
          seed = (seed * 16807) % 2147483647;
          data[i] = (seed / 2147483647) * 2 - 1;
        }
      }
      await this.context.resume();
      if (!this.enabled) {
        await this.context.suspend();
        this.state = 'muted';
        this.notify();
        return;
      }
      this.state = 'playing';
      this.refresh();
    } catch {
      this.state = 'blocked';
    }
    this.notify();
  }
  async toggle() {
    if (this.enabled && this.state === 'blocked') {
      await this.enable();
      return;
    }
    this.enabled = !this.enabled;
    try {
      localStorage.setItem('sinefine.sound.v1', this.enabled ? 'on' : 'off');
    } catch {
      /* Optional preference. */
    }
    if (this.enabled) await this.enable();
    else {
      this.stopAmbient();
      await this.context?.suspend();
      this.state = 'muted';
      this.notify();
    }
  }
  claim(scene: Scene) {
    const token = Symbol();
    this.scenes.set(token, scene);
    this.refresh();
    return () => {
      this.scenes.delete(token);
      this.refresh();
    };
  }
  private stopAmbient() {
    if (this.birds) clearInterval(this.birds);
    this.birds = null;
    if (this.ambient && this.context) {
      const old = this.ambient;
      old.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.12);
      old.source.stop(this.context.currentTime + 0.6);
      this.ambient = null;
    }
  }
  private refresh() {
    const scene = [...this.scenes.values()].at(-1) ?? null;
    const changed = scene?.key !== this.last?.key;
    if (changed) this.clock.reset();
    const door =
      scene &&
      this.lastDoorScene &&
      scene.key !== this.lastDoorScene.key &&
      (this.lastDoorScene.ambient !== 'outdoor' || scene.ambient !== 'outdoor');
    if (scene) this.lastDoorScene = scene;
    this.last = scene;
    if (!this.enabled || !this.context || !this.master || !this.noise) return;
    this.stopAmbient();
    if (!scene) return;
    const c = this.context,
      source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = this.noise;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = scene.ambient === 'outdoor' ? 420 : 180;
    gain.gain.value =
      scene.ambient === 'outdoor'
        ? 0.022
        : scene.ambient === 'shop'
          ? 0.009
          : 0.005;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    this.ambient = { source, gain };
    if (door) this.door();
    if (scene.ambient === 'outdoor')
      this.birds = setInterval(() => this.bird(), 11000);
  }
  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
  ) {
    const c = this.context;
    if (
      !this.enabled ||
      c?.state !== 'running' ||
      document.hidden ||
      !this.master
    )
      return;
    const oscillator = c.createOscillator(),
      gain = c.createGain(),
      now = c.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
  private noiseHit(duration: number, volume: number, frequency: number) {
    const c = this.context;
    if (
      !this.enabled ||
      c?.state !== 'running' ||
      document.hidden ||
      !this.master ||
      !this.noise
    )
      return;
    const source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain(),
      now = c.currentTime;
    source.buffer = this.noise;
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }
  walk(distance: number, material: GroundSound) {
    const steps = this.clock.advance(distance);
    if (!steps) return;
    this.noiseHit(
      material === 'tatami' ? 0.09 : 0.065,
      material === 'tatami' ? 0.045 : 0.085,
      material === 'stone' ? 1600 : 650,
    );
    if (material === 'wood') this.tone(135, 0.075, 0.04, 'triangle');
  }
  door() {
    this.noiseHit(0.2, 0.07, 900);
    this.tone(190, 0.18, 0.035, 'triangle');
  }
  interact(kind: string) {
    if (kind === 'wrap') this.noiseHit(0.36, 0.055, 2200);
    else if (kind === 'read') this.noiseHit(0.19, 0.035, 1900);
    else if (kind === 'pour') this.noiseHit(0.55, 0.04, 1300);
  }
  private bird() {
    this.tone(1800, 0.12, 0.016);
  }
}
export const fateAudio = new FateAudio();
