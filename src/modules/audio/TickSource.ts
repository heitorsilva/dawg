import { mergeObjects } from '@/modules/audio/utils';
import { TimelineState } from '@/modules/audio/TimelineState';
import { Timeline } from '@/modules/audio/Timeline';
import { ContextTime, Ticks, Time } from '@/modules/audio/types';
import { Context } from '@/modules/audio/Context';
import { literal } from '@/utils';
import { TickSignal } from '@/modules/audio/TickSignal';

interface TickSourceOptions {
  frequency: number;
}

/**
 *  @class  Uses [Tone.TickSignal](TickSignal) to track elapsed ticks with
 *  		complex automation curves.
 *
 * 	@constructor
 *  @extends {Tone}
 *  @param {Frequency} frequency The initial frequency that the signal ticks at
 *  @param {Tone.Param=} param A parameter to control (such as playbackRate)
 */
export class TickSource {
  public readonly frequency: TickSignal;
  private timeline = new TimelineState('stopped');

  // This timeline records all of the times where the ticks we manually set
  // For example, a user might set a position on the timeline or the transport might loop
  private tickOffset = new Timeline<{ time: number, ticks: number }>();

  constructor(opts?: Partial<TickSourceOptions>) {
    const options = mergeObjects(opts, { frequency: 1 });
    this.frequency = new TickSignal(options);
    this.setTicksAtTime(0, 0);
  }

  /**
   *  The time since ticks=0 that the TickSource has been running. Accounts
   *  for tempo curves
   *  @name seconds
   *  @type {Seconds}
   */
  get seconds() {
    return this.getSecondsAtTime(Context.now());
  }

  set seconds(s: number) {
    const now = Context.now();
    const ticks = this.frequency.timeToTicks(s, now);
    this.setTicksAtTime(ticks.valueOf(), now); // TODO
  }

  /**
   *  The number of times the callback was invoked. Starts counting at 0
   *  and increments after the callback was invoked. Returns -1 when stopped.
   *  @name ticks
   *  @type {Ticks}
   */
  get ticks() {
    return this.getTicksAtTime(Context.now());
  }

  set ticks(t) {
    this.setTicksAtTime(t, Context.now());
  }

  /**
   *  Start the clock at the given time. Optionally pass in an offset
   *  of where to start the tick counter from.
   *  @param  {Time=}  time    The time the clock should start
   *  @param {Ticks} [offset=0] The number of ticks to start the source at
   *  @return  {Tone.TickSource}  this
   */
  public start(time?: Time, offset?: number) {
    time = Context.toSeconds(time);
    if (this.timeline.getValueAtTime(time) !== 'started') {
      this.timeline.setStateAtTime({
        state: 'started',
        time,
      });

      if (typeof offset !== 'undefined') {
        this.setTicksAtTime(offset, time);
      }
    }
    return this;
  }

  /**
   *  Pause the clock. Pausing does not reset the tick counter.
   *  @param {Time} [time=now] The time when the clock should stop.
   *  @returns {Tone.TickSource} this
   */
  public pause(time?: Time) {
    time = Context.toSeconds(time);
    if (this.timeline.getValueAtTime(time) === 'started') {
      this.timeline.setStateAtTime({
        state: 'paused',
        time,
      });
    }
    return this;
  }

  /**
   *  Stop the clock. Stopping the clock resets the tick counter to 0.
   *  @param {Time} [time=now] The time when the clock should stop.
   *  @returns {Tone.TickSource} this
   *  @example
   * clock.stop();
   */
  public stop(time?: ContextTime) {
    time = Context.toSeconds(time);
    // cancel the previous stop
    if (this.timeline.getValueAtTime(time) === 'stopped') {
      const event = this.timeline.get(time);
      if (event && event.time > 0) {
        this.tickOffset.cancel(event.time);
        this.timeline.cancel(event.time);
      }
    }
    this.timeline.cancel(time);
    this.timeline.setStateAtTime({
      state: 'stopped',
      time,
    });
    this.setTicksAtTime(0, time);
    return this;
  }

  public forEachTickBetween(
    startTime: ContextTime,
    endTime: ContextTime,
    callback: (time: ContextTime, ticks: Ticks) => void,
  ) {

    // only iterate through the sections where it is "started"
    let lastStateEvent = this.timeline.get(startTime);
    this.timeline.forEachBetween(startTime, endTime, (event) => {
      if (lastStateEvent && lastStateEvent.state === 'started' && event.state !== 'started') {
        this.forEachTickBetween(Math.max(lastStateEvent.time, startTime), event.time - Context.sampleTime, callback);
      }
      lastStateEvent = event;
    });

    startTime = lastStateEvent ? Math.max(lastStateEvent.time, startTime) : startTime;

    let error = null;
    if (lastStateEvent && lastStateEvent.state === 'started' && this.timeline) {
      // figure out the difference between the frequency ticks and the
      const startTicks = this.frequency.getTicksAtTime(startTime);
      const ticksAtStart = this.frequency.getTicksAtTime(lastStateEvent.time);
      const diff = startTicks - ticksAtStart;
      let offset = diff % 1;
      if (offset !== 0) {
        offset = 1 - offset;
      }
      let nextTickTime = this.frequency.getTimeOfTick(startTicks + offset);
      while (nextTickTime < endTime && this.timeline) {
        try {
          callback(nextTickTime, Math.round(this.getTicksAtTime(nextTickTime)));
        } catch (e) {
          error = e;
          break;
        }
        if (this.timeline) {
          nextTickTime += this.frequency.getDurationOfTicks(1, nextTickTime);
        }
      }
    }

    if (error) {
      throw error;
    }

    return this;
  }

  /**
   * Set the clock's ticks at the given time.
   * @param  {Ticks} ticks The tick value to set
   * @param  {Time} time  When to set the tick value
   * @return {Tone.TickSource}       this
   */
  public setTicksAtTime(ticks: Ticks, time: ContextTime) {
    this.tickOffset.cancel(time);
    this.tickOffset.add({
      time,
      ticks,
    });
    return this;
  }

  /**
   *  Return the elapsed seconds at the given time.
   *  @param  {Time}  time  When to get the elapsed seconds
   *  @return  {Seconds}  The number of elapsed seconds
   */
  public getSecondsAtTime(time: ContextTime) {
    return this.getElapsedAtTime(time).seconds;
  }

  /**
   * Get the elapsed ticks at the given context time.
   *
   * @param time  When to get the tick value
   * @return The number of ticks
   */
  public getTicksAtTime(time: ContextTime) {
    return this.getElapsedAtTime(time).ticks;
  }

  /**
   *  Return the elapsed seconds at the given time.
   *  @param  {Time}  time  When to get the elapsed seconds
   *  @return  {Seconds}  The number of elapsed seconds
   */
  private getElapsedAtTime(time: ContextTime) {
    // We use the last stop event as we know that the elapsed times reset to 0 here
    // So, this is just an optimization. We don't really need to do this (ie. we could iterate though all events)
    let stopEvent = this.timeline.getLastState('stopped', time);
    if (!stopEvent) {
      stopEvent = { state: 'stopped', time: 0 };
    }
    // this event allows forEachBetween to iterate until the current time
    const tmpEvent = { state : literal('paused'), time };
    this.timeline.add(tmpEvent);

    // the amount of seconds/ticks that have elapsed since the last stop
    const elapsed = { seconds: 0, ticks: 0 };

    // iterate through all the events since the last stop
    let previous = stopEvent;
    this.timeline.forEachBetween(stopEvent.time, time + Context.sampleTime, (current) => {
      let periodStartTime = previous.time;

      // If there is an offset event in this period use that
      // For example, if we reset the transport to 0 while playing, we don't care at all what happened before the reset
      // So, we reset the elapsed ticks/seconds and then set the start of the period to the start of the offset
      const offsetEvent = this.tickOffset.get(current.time);
      if (offsetEvent && offsetEvent.time >= (previous ? previous.time : 0)) {
        elapsed.seconds = this.frequency.getDurationOfTicks(offsetEvent.ticks, offsetEvent.time);
        elapsed.ticks = offsetEvent.ticks;
        periodStartTime = offsetEvent.time;
      }

      // FIXME should we also use something like this.frequency.getTicksAtTime for seconds??
      if (previous.state === 'started' && current.state !== 'started') {
        elapsed.seconds += current.time - periodStartTime;
        elapsed.ticks += this.frequency.getTicksAtTime(current.time) - this.frequency.getTicksAtTime(periodStartTime);
      }

      previous = current;
    });

    // remove the temporary event
    this.timeline.remove(tmpEvent);

    // return the ticks
    return elapsed;
  }
}
