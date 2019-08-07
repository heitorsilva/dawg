import Tone from 'tone';
import { Emitter } from '@/modules/audio/Emitter';
import { mergeObjects } from '@/modules/audio/utils';
import { value } from 'vue-function-api';
import { Time } from '@/modules/audio/types';

interface Options {
  lookAhead: number;
  updateInterval: number;
}

const defaults: Options = {
  lookAhead : 0.1,
  updateInterval : 0.03,
};

class Ticker {
  private worker: Worker;

  constructor(callback: () => void, updateInterval: number) {
    const blob = new Blob([
      // the initial timeout time
      'var timeoutTime = ' + (updateInterval * 1000).toFixed(1) + ';' +
      // onmessage callback
      'self.onmessage = function(msg){' +
      '	timeoutTime = parseInt(msg.data);' +
      '};' +
      // the tick function which posts a message
      // and schedules a new tick
      'function tick(){' +
      '	setTimeout(tick, timeoutTime);' +
      '	self.postMessage(\'tick\');' +
      '}' +
      // call tick initially
      'tick();',
    ]);

    const blobUrl = URL.createObjectURL(blob);
    this.worker = new Worker(blobUrl);

    this.worker.onmessage = callback;
  }

  public dispose() {
    this.worker.terminate();
  }
}

export class Context extends Emitter<{ tick: [], statechange: [Event], close: [] }> {
  public static context = value(new Context());

  public static now() {
    return Context.context.value.now();
  }

  public static immediate() {
    return Context.context.value.immediate();
  }

  public static resume() {
    return Context.context.value.resume();
  }

  public static toTicks(time: Time) {
    return (new Tone.TransportTime(time)).toTicks();
  }

  public static toSeconds(time: Time | undefined): number {
    switch (typeof time) {
      case 'string':
        return (new Tone.Time(time)).toSeconds();
      case 'undefined':
        return Context.now();
      case 'number':
        return time;
    }
  }

  public static getRawContext() {
    return Context.context.value.getRawContext();
  }

  public static get sampleTime() {
    return Context.context.value.sampleTime;
  }

  /**
   * 	Most browsers will not play _any_ audio until a user
   * 	clicks something (like a play button). Invoke this method
   * 	on a click or keypress event handler to start the audio context.
   * 	More about the Autoplay policy
   * [here](https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio)
   *  @return This promise is resolved when the audio context is started.
   *  @example
   * document.querySelector('#playbutton').addEventListener('click', () => Tone.start())
   */
  public static start() {
    Context.context.value.resume();
  }

  private context = (Tone.context as any)._context as unknown as AudioContext;
  private ticker: Ticker;
  private lookAhead: number;

  constructor(opts?: Partial<Options>) {
    super();
    const options = mergeObjects(opts, defaults);
    this.lookAhead = options.lookAhead;
    this.ticker = new Ticker(this.emit.bind(this, 'tick'), options.updateInterval);
  }

  get sampleTime() {
    return 1 / this.context.sampleRate;
  }

  public decodeAudioData(audioData: ArrayBuffer) {
    return this.context.decodeAudioData(audioData);
  }

  public createAnalyser() {
    return this.context.createAnalyser();
  }

  public now() {
    return this.context.currentTime + this.lookAhead;
  }

  public immediate() {
    return this.context.currentTime;
  }

  public resume() {
    if (this.context.state === 'suspended') {
      return this.context.resume();
    } else {
      return Promise.resolve();
    }
  }

  public getRawContext() {
    return this.context;
  }

  public dispose() {
    this.ticker.dispose();
  }
}
