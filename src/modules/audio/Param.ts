import { AutomationType, Time, ContextTime } from '@/modules/audio/types';
import { mergeObjects } from '@/modules/audio/utils';
import { Timeline } from '@/modules/audio/Timeline';
import { Context } from '@/modules/audio/Context';

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

    this.initialValue = this.fromUnits(options.value);
    this.param.setValueAtTime(options.value, 0);

    // this.setValueAtTime({ value: options.value, time: 0 });
  }

  /**
   * The current value of the parameter.
   * @memberOf Tone.Param#
   * @type {Number}
   * @name value
   */
  get value() {
    const now = Context.now();
    return this.toUnits(this.getValueAtTime(now));
  }

  set value(value) {
    this.initialValue = this.fromUnits(value);
    this.cancelScheduledValues(Context.now());
    this.setValueAtTime({ value, time: Context.now() });
  }

  // TODO remove these methods. We should wrap a paramter instead, but I'm not sure exactly how to do that yet.
  /**
   * An overridable method to convert the current value to it's original units.
   *
   * @param value The value to convert.
   */
  public fromUnits(value: number) {
    return value;
  }

  /**
   * An overridable method to convert the current value to it's new units.
   *
   * @param value The value to convert.
   */
  public toUnits(value: number) {
    return value;
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
    const before = this.events.get(time) || { type: 'setValueAtTime', value: this.initialValue, time: 0 };
    let value = this.initialValue;

    if (before.type === 'setTargetAtTime') {
      const previous = this.events.getBefore(before.time);
      let previousVal;
      if (previous === null) {
        previousVal = this.initialValue;
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
    const time = args.time;
    const value = this.fromUnits(args.value);

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
      value: this.fromUnits(args.value),
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
    const value = Math.max(this.minOutput, this.fromUnits(args.value));
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

  public dispose() {
    this.events.dispose();
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
    // TODO what if v0 === 0 or t1 === t0
    return v0 * Math.pow(v1 / v0, (t - t0) / (t1 - t0));
  }
}
