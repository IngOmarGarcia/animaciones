import * as THREE from 'three';

// ANIMATION: reproducción de clips. No sabe de identidad ni de cómo se dibuja el personaje,
// así que los mismos clips sirven para cualquier futbolista.

export class AnimationSet {
  constructor(root, clips = []) {
    this.mixer = new THREE.AnimationMixer(root);
    this.clips = clips;
    this.actions = new Map();
    this.current = null;
    this.speed = 1;
    this.playing = true;
    if (clips.length) this.play(clips[0].name);
  }

  get names() {
    return this.clips.map((c) => c.name);
  }

  play(name, { loop = THREE.LoopRepeat, fade = 0 } = {}) {
    const clip = this.clips.find((c) => c.name === name) || this.clips[0];
    if (!clip) return null;
    let action = this.actions.get(clip.name);
    if (!action) {
      action = this.mixer.clipAction(clip);
      this.actions.set(clip.name, action);
    }
    action.setLoop(loop, Infinity);
    if (this.current && this.current !== action && fade > 0) {
      this.current.fadeOut(fade);
      action.reset().fadeIn(fade).play();
    } else {
      if (this.current && this.current !== action) this.current.stop();
      action.reset().play();
    }
    this.current = action;
    this.mixer.update(0);
    return action;
  }

  // En pausa se sigue llamando al mixer con dt = 0: así vuelve a escribir la pose de este
  // instante en los huesos y los ajustes de identidad (que se aplican después) no se acumulan.
  update(dt) {
    this.mixer.update(this.playing ? dt * this.speed : 0);
  }

  setPlaying(playing) {
    this.playing = playing;
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  setTime(t) {
    this.mixer.setTime(t);
  }

  get time() {
    return this.current ? this.current.time : 0;
  }

  get duration() {
    return this.current ? this.current.getClip().duration : 0;
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}
