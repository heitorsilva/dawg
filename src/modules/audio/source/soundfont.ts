import Tone from 'tone';
import { Time, ContextTime } from '@/modules/audio/types';
import { Source } from '@/modules/audio/source/source';
import * as soundfonts from 'soundfont-player';
import { Context } from '@/modules/audio/Context';


// tslint:disable-next-line:no-empty-interface
export interface SoundfontOptions {
  // No options yet
}

/**
 * A soundfont source. Uses `soundfont-player` under the hood.
 */
export class Soundfont implements Source<SoundfontOptions> {

  public static load(name: soundfonts.InstrumentName) {
    try {
      return new Soundfont(soundfonts.instrument(Context.getRawContext(), name));
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.warn(e.message);
      return null;
    }
  }

  private player: soundfonts.Player | null = null;
  private playingNotes: { [key: string]: soundfonts.Player } = {};

  constructor(promise: Promise<soundfonts.Player>) {
    promise.then((player) => {
      this.player = player;
    });
  }

  public triggerAttackRelease(note: string, duration: Time, time: ContextTime, velocity?: number) {
    if (this.player === null) {
      return this;
    }

    const durationSeconds = new Tone.TransportTime(duration).toSeconds();
    this.player.play(note, time, {
      duration: durationSeconds,
      gain: velocity,
    });

    return this;
  }

  public triggerAttack(note: string, time?: Time, velocity?: number): this {
    if (this.player === null) {
      return this;
    }

    this.playingNotes[note] = this.player.play(note, undefined, {gain: velocity});
    return this;
  }

  public triggerRelease(note: string): this {
    if (note in this.playingNotes) {
      this.playingNotes[note].stop();
      delete this.playingNotes[note];
    }
    return this;
  }

  public connect(node: Tone.AudioNode): this {
    if (this.player === null) {
      return this;
    }

    // FIXME(3) A bit of a hacky solution to make Tone.js work with soundfonts
    this.player.connect((node as any).output);
    return this;
  }

  public disconnect(node: Tone.AudioNode) {
    // We can't disconnect right now
    // That option isn't available to us
    return this;
  }

  public set<K extends keyof SoundfontOptions>(o: { key: K, value: SoundfontOptions[K] }) {
    this[o.key] = o.value;
  }
}
