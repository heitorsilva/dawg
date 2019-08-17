import Tone from 'tone';
import { Signal } from '@/modules/audio/Signal';
import { mergeObjects } from '@/modules/audio/utils';
import { Time, Ticks, ContextTime } from '@/modules/audio/types';
import { Context } from '@/modules/audio/Context';
import { ParamEvent } from '@/modules/audio/Param';

interface TickSignalOptions {
  frequency: number;
}

const defaults: TickSignalOptions = {
  frequency: 1,
};


/**
 * @class Tone.TickSignal extends Tone.Signal, but adds the capability
 *        to calculate the number of elapsed ticks. exponential and target curves
 *        are approximated with multiple linear ramps.
 *
 *        Thank you Bruno Dias, H. Sofia Pinto, and David M. Matos, for your
 *        [WAC paper](https://smartech.gatech.edu/bitstream/handle/1853/54588/WAC2016-49.pdf)
 *        describing integrating timing functions for tempo calculations.
 *
 * @param {Number} value The initial value of the signal
 */
export class TickSignal extends Signal {
  private ticks: { [id: string]: Ticks } = {};
  private disposer: () => void;

  constructor(opts?: TickSignalOptions) {
    super({
      value: mergeObjects(opts, defaults).frequency,
    });

    const addDisposer = this.events.on('add', (e) => {
      const previousEvent = this.events.previousEvent(e);
      const ticks = this._getTicksAtTime(e.time, previousEvent);
      this.ticks[e.id] = Math.max(ticks, 0);
    });

    const removeDisposer = this.events.on('remove', (e) => {
      delete this.ticks[e.id];
    });

    this.disposer = () => {
      addDisposer.dispose();
      removeDisposer.dispose();
    };
  }

  /**
   * The inverse of [ticksToTime](#tickstotime). Convert a duration in
   * seconds to the corresponding number of ticks accounting for any
   * automation curves starting at the given time.
   * @param  {Time} duration The time interval to convert to ticks.
   * @param  {Time} [when=now]     When along the automation timeline to convert the ticks.
   * @return {Tone.Ticks}          The duration in ticks.
   */
  public timeToTicks(duration: Time, when: Time) {
    when = Context.toSeconds(when);
    duration = Context.toSeconds(duration);
    const startTicks = this.getTicksAtTime(when);
    const endTicks = this.getTicksAtTime(when + duration);
    return new Tone.Ticks(endTicks - startTicks);
  }

  /**
   *  Schedules an exponential continuous change in parameter value from
   *  the previous scheduled parameter value to the given value. This method uses
   * `linearRampToValueAtTime` to approximate `exponentialRampToValueAtTime` using 10 segments per
   *  second.
   *
   *  @param  {number} value
   *  @param  {Time} endTime
   *  @returns {Tone.TickSignal} this
   */
  public exponentialRampToValueAtTime(args: { value: number, endTime: ContextTime }) {
    // aproximate it with multiple linear ramps
    const { value, endTime } = args;

    // start from previously scheduled value
    const { time: prevTime, value: prevValue } = this.events.get(endTime) || { time: 0, value: 0 };

    // approx 10 segments per second
    const segments = Math.round(Math.max((endTime - prevTime) * 10, 1));
    const segmentDur = ((endTime - prevTime) / segments);
    for (let i = 0; i <= segments; i++) {
      const segTime = segmentDur * i + prevTime;
      const rampVal = this._exponentialInterpolate(prevTime, prevValue, endTime, value, segTime);
      this.linearRampToValueAtTime({ value: rampVal, endTime: segTime });
    }
    return this;
  }

  /**
   * Returns the tick value at the time. Takes into account
   * any automation curves scheduled on the signal.
   * @param  {Time} time The time to get the tick count at
   * @return {Ticks}      The number of ticks which have elapsed at the time
   *                          given any automations.
   */
  public getTicksAtTime(time: ContextTime) {
    const event = this.events.get(time);
    return Math.max(this._getTicksAtTime(time, event), 0);
  }

  /**
   * Given a tick, returns the time that tick occurs at.
   * @param  {Ticks} tick
   * @return {Time}      The time that the tick occurs.
   */
  public getTimeOfTick(tick: Ticks) {
    const before = this.events.get(tick, (e) => this.ticks[e.id]);
    const after = this.events.getAfter(tick, (e) => this.ticks[e.id]);
    if (before && this.ticks[before.id] === tick) {
      return before.time;
    } else if (before && after && after.type === 'linearRampToValueAtTime' &&
      before.value !== after.value) {
      const val0 = this.getValueAtTime(before.time);
      const val1 = this.getValueAtTime(after.time);
      const delta = (val1 - val0) / (after.time - before.time);
      const k = Math.sqrt(Math.pow(val0, 2) - 2 * delta * (this.ticks[before.id] - tick));
      const sol1 = (-val0 + k) / delta;
      const sol2 = (-val0 - k) / delta;
      return (sol1 > 0 ? sol1 : sol2) + before.time;
    } else if (before) {
      if (before.value === 0) {
        return Infinity;
      } else {
        return before.time + (tick - this.ticks[before.id]) / before.value;
      }
    } else {
      return tick / this.initialValue;
    }
  }

  /**
   * Return the elapsed time of the number of ticks from the given time
   * @param {Ticks} ticks The number of ticks to calculate
   * @param  {Time} time The time to get the next tick from
   * @return {Seconds} The duration of the number of ticks from the given time in seconds
   */
  public getDurationOfTicks(ticks: Ticks, time: ContextTime) {
    const currentTick = this.getTicksAtTime(time);
    return this.getTimeOfTick(currentTick + ticks) - time;
  }

  public dispose() {
    this.disposer();
  }

  /**
   * Returns the tick value at the time. Takes into account any automation curves scheduled on the
   * signal.
   *
   * @param  {Time} time The time to get the tick count at
   * @return {Ticks}      The number of ticks which have elapsed at the time
   *                          given any automations.
   */
  private _getTicksAtTime(time: ContextTime, event: { time: number, id: number | undefined } | null): Ticks {
    event = event || { time: 0, id: undefined };

    const val0 = this.getValueAtTime(event.time);
    let val1 = this.getValueAtTime(time);

    // if it's right on the line, take the previous value
    const e = this.events.get(time);
    if (e && e.time === time && e.type === 'setValueAtTime') {
      val1 = this.getValueAtTime(time - Context.sampleTime);
    }

    return 0.5 * (time - event.time) * (val0 + val1) + (event.id === undefined ? 0 : this.ticks[event.id]);
  }
}
