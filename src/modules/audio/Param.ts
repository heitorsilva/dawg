import { GraphNode } from '@/modules/audio/GraphNode';
import { AutomationType, Time, ContextTime } from '@/modules/audio/types';
import { mergeObjects } from '@/modules/audio/utils';
import { Timeline } from '@/modules/audio/Timeline';
import { Context } from '@/modules/audio/Context';
import { Emitter } from '@/modules/audio/Emitter';

export interface ParamOptions {
  value: number;
}

const defaults: ParamOptions = {
  value: 0,
};

type Exclude<T, U extends T> = T extends U ? never : T;

export type ParamEvent = {
  time: number,
  value: number,
  id: number;
} & ({
  type: 'setTargetAtTime',
  constant: number,
} | {
  type: Exclude<AutomationType, 'setTargetAtTime'>,
});


/**
 *  @class Tone.Param wraps the native Web Audio's AudioParam to provide
 *         additional unit conversion functionality. It also
 *         serves as a base-class for classes which have a single,
 *         automatable parameter.
 *  @extends {Tone.AudioNode}
 *  @param  {AudioParam}  param  The parameter to wrap.
 *  @param  {Tone.Type} units The units of the audio param.
 *  @param  {Boolean} convert If the param should be converted.
 */
export class Param {
  public overridden = false;
  public param: AudioParam;
  protected initialValue: number;
  protected events = new Timeline<ParamEvent>(1000);
  private id = 0;
  private minOutput = 1e-5;

  constructor(param: AudioParam, opts?: Partial<ParamOptions>) {
    this.param = param;
    const options = mergeObjects(opts, defaults);

    // to satisfy typescript
    this.initialValue = options.value;

    // this does the same as above
    this.value = options.value;
  }

  /**
   * The current value of the parameter.
   * @memberOf Tone.Param#
   * @type {Number}
   * @name value
   */
  get value() {
    const now = Context.now();
    return this.getValueAtTime(now);
  }

  set value(value) {
    this.initialValue = value;
    this.cancelScheduledValues(Context.now());
    this.setValueAtTime({ value, time: Context.now() });
  }

  /**
   *  Get the signals value at the given time. Subsequent scheduling
   *  may invalidate the returned value.
   *  @param {Time} time When to get the value
   *  @returns {Number} The value at the given time
   */
  public getValueAtTime(time: Time) {
    time = Context.toSeconds(time);
    const after = this.events.getAfter(time);
    const before = this.events.get(time);
    const initialValue = this.initialValue === undefined ? this.param.defaultValue : this.initialValue;
    let value = initialValue;
    // if it was set by
    if (before === null) {
      value = initialValue;
    } else if (before.type === 'setTargetAtTime') {
      const previous = this.events.getBefore(before.time);
      let previousVal;
      if (previous === null) {
        previousVal = initialValue;
      } else {
        previousVal = previous.value;
      }
      value = this._exponentialApproach(before.time, previousVal, before.value, before.constant, time);
    } else if (after === null) {
      value = before.value;
    } else if (after.type === 'linearRampToValueAtTime') {
      value = this._linearInterpolate(before.time, before.value, after.time, after.value, time);
    } else if (after.type === 'exponentialRampToValueAtTime') {
      value = this._exponentialInterpolate(before.time, before.value, after.time, after.value, time);
    } else {
      value = before.value;
    }
    return value;
  }

  /**
   *  Schedules a parameter value change at the given time.
   *  @param {Time}  time The time when the change should occur.
   *  @param {*}	value The value to set the signal.
   *  @returns {Tone.Param} this
   *  @example
   * //set the frequency to "G4" in exactly 1 second from now.
   * freq.setValueAtTime("G4", "+1");
   */
  public setValueAtTime(args: { time: ContextTime, value: number }) {
    const { time, value } = args;

    const e: ParamEvent = {
      type: 'setValueAtTime',
      value,
      time,
      id: this.id++,
    };

    this.events.add(e);

    this.param.setValueAtTime(value, time);
    return this;
  }

  /**
   *  Schedules a linear continuous change in parameter value from the
   *  previous scheduled parameter value to the given value.
   *
   *  @param  {number} value
   *  @param  {Time} endTime
   *  @returns {Tone.Param} this
   */
  public linearRampToValueAtTime(args: { value: number, endTime: ContextTime }) {
    this.events.add({
      type : 'linearRampToValueAtTime',
      value: args.value,
      time: args.endTime,
      id: this.id++,
    });

    this.param.linearRampToValueAtTime(args.value, args.endTime);
    return this;
  }

  /**
   *  Schedules an exponential continuous change in parameter value from
   *  the previous scheduled parameter value to the given value.
   *
   *  @param  {number} value
   *  @param  {Time} endTime
   *  @returns {Tone.Param} this
   */
  public exponentialRampToValueAtTime(args: { value: number, endTime: ContextTime}) {
    const value = Math.max(this.minOutput, args.value);
    const endTime = args.endTime;

    this.events.add({
      type : 'exponentialRampToValueAtTime',
      time : endTime,
      value,
      id: this.id++,
    });

    this.param.exponentialRampToValueAtTime(value, endTime);
    return this;
  }

  /**
   *  Cancels all scheduled parameter changes with times greater than or
   *  equal to time.
   *
   *  @param  {Time} time
   *  @returns {Tone.Param} this
   */
  public cancelScheduledValues(time: Time) {
    time = Context.toSeconds(time);
    this.events.cancel(time);
    this.param.cancelScheduledValues(time);
    return this;
  }

  protected _exponentialApproach(
    t0: number, v0: number, v1: number, timeConstant: number, t: number,
  ) {
    return v1 + (v0 - v1) * Math.exp(-(t - t0) / timeConstant);
  }

  // Calculates the the value along the curve produced by linearRampToValueAtTime
  protected _linearInterpolate(t0: number, v0: number, t1: number, v1: number, t: number) {
    return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
  }

  // Calculates the the value along the curve produced by exponentialRampToValueAtTime
  protected _exponentialInterpolate(t0: number, v0: number, t1: number, v1: number, t: number) {
    return v0 * Math.pow(v1 / v0, (t - t0) / (t1 - t0));
  }
}
