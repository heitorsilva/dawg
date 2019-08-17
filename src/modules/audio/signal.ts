import { Param } from '@/modules/audio/Param';
import { mergeObjects } from '@/modules/audio/utils';
import { Context } from '@/modules/audio/Context';

interface SignalOptions {
  value: number;
}

const defaults: SignalOptions = {
  value: 0,
};

/**
 *  @class  A signal is an audio-rate value. Tone.Signal is a core component of the library.
 *          Unlike a number, Signals can be scheduled with sample-level accuracy. Tone.Signal
 *          has all of the methods available to native Web Audio
 *          [AudioParam](http://webaudio.github.io/web-audio-api/#the-audioparam-interface)
 *          as well as additional conveniences. Read more about working with signals
 *          [here](https://github.com/Tonejs/Tone.js/wiki/Signals).
 *
 *  @constructor
 *  @extends {Tone.Param}
 *  @param {Number|AudioParam} [value] Initial value of the signal. If an AudioParam
 *                                     is passed in, that parameter will be wrapped
 *                                     and controlled by the Signal.
 *  @param {string} [units=Number] unit The units the signal is in.
 *  @example
 * var signal = new Tone.Signal(10);
 */
export abstract class Signal extends Param {
  constructor(opts?: Partial<SignalOptions>) {
    const constantSource = Context.createConstantSource();
    super(constantSource.offset, mergeObjects(opts, defaults));
  }
}
