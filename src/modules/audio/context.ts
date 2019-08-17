import Tone from 'tone';
import { Time } from '@/modules/audio/types';
import { emitter } from '@/base/events';
import { Gain } from '@/modules/audio/Gain';

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


const events = emitter<{ tick: [], statechange: [Event], close: [] }>();
const ticker = new Ticker(() => events.emit('tick'), 0.03); // updateInterval FIXME

export class Context {
  public static context = (Tone.context as any)._context as unknown as AudioContext;
  public static lookAhead = 0.1;

  public static now() {
    return Context.context.currentTime + Context.lookAhead;
  }

  public static createGain() {
    return new Gain(Context.context.createGain());
  }

  public static immediate() {
    return Context.context.currentTime;
  }

  public static toTicks(time: Time) {
    return (new Tone.TransportTime(time)).toTicks();
  }

  public static createConstantSource() {
    return Context.context.createConstantSource();
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
    return Context.context;
  }

  public static get sampleTime() {
    return 1 / Context.context.sampleRate;
  }

  public static decodeAudioData(audioData: ArrayBuffer) {
    return Context.context.decodeAudioData(audioData);
  }

  public static createAnalyser() {
    return Context.context.createAnalyser();
  }

  public static resume() {
    if (Context.context.state === 'suspended') {
      return Context.context.resume();
    } else {
      return Promise.resolve();
    }
  }

  public static onDidTick(f: () => void) {
    events.on('tick', f);
    return {
      dispose: () => {
        events.off('tick', f);
      },
    };
  }

  public static dispose() {
    ticker.dispose();
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
    Context.context.resume();
  }
}
