import { Tone } from '@/modules/audio/Tone';
import { mergeObjects } from '@/modules/audio/checks';
import { Time } from '@/modules/audio/types';

interface TickSourceOptions {
  frequency: number;
}

const defaults: TickSourceOptions = {
  frequency: 1,
};

/**
 *  @class  Uses [Tone.TickSignal](TickSignal) to track elapsed ticks with
 *  		complex automation curves.
 *
 * 	@constructor
 *  @extends {Tone}
 *  @param {Frequency} frequency The initial frequency that the signal ticks at
 *  @param {Tone.Param=} param A parameter to control (such as playbackRate)
 */
export class TickSource extends Tone {
  // /**
  //  *  The frequency the callback function should be invoked.
  //  *  @type  {Frequency}
  //  *  @signal
  //  */
  public readonly frequency: Tone.TickSignal;

  // /**
  //  *  The state timeline
  //  *  @type {Tone.TimelineState}
  //  *  @private
  //  */
  private _state = new Tone.TimelineState('stopped');

  // /**
  //  * The offset values of the ticks
  //  * @type {Tone.Timeline}
  //  * @private
  //  */
  private _tickOffset = new Tone.Timeline();

  constructor(ops?: Partial<TickSourceOptions>) {
    super();
    const options = mergeObjects(ops, defaults);
    this.frequency = new Tone.TickSignal(options.frequency);


    this._state.setStateAtTime(Tone.State.Stopped, 0);

    // add the first event
    this.setTicksAtTime(0, 0);
  }

  /**
	 *  Returns the playback state of the source, either "started", "stopped" or "paused".
	 *  @type {Tone.State}
	 *  @readOnly
	 *  @memberOf Tone.TickSource#
	 *  @name state
	 */
  get state() {
    return this._state.getValueAtTime(this.now());
  }

  /**
	 *  Start the clock at the given time. Optionally pass in an offset
	 *  of where to start the tick counter from.
	 *  @param  {Time=}  time    The time the clock should start
	 *  @param {Ticks} [offset=0] The number of ticks to start the source at
	 *  @return  {Tone.TickSource}  this
	 */
  public start(time: PrimitiveTime, offset: PrimitiveTicks) {
    time = this.toSeconds(time);
    if (this._state.getValueAtTime(time) !== Tone.State.Started) {
      this._state.setStateAtTime(Tone.State.Started, time);
      if (Tone.isDefined(offset)) {
        this.setTicksAtTime(offset, time);
      }
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
  public stop(time) {
    time = this.toSeconds(time);
    // cancel the previous stop
    if (this._state.getValueAtTime(time) === Tone.State.Stopped) {
      const event = this._state.get(time);
      if (event.time > 0) {
        this._tickOffset.cancel(event.time);
        this._state.cancel(event.time);
      }
    }
    this._state.cancel(time);
    this._state.setStateAtTime(Tone.State.Stopped, time);
    this.setTicksAtTime(0, time);
    return this;
  }

  /**
	 *  Pause the clock. Pausing does not reset the tick counter.
	 *  @param {Time} [time=now] The time when the clock should stop.
	 *  @returns {Tone.TickSource} this
	 */
  public pause(time) {
    time = this.toSeconds(time);
    if (this._state.getValueAtTime(time) === Tone.State.Started) {
      this._state.setStateAtTime(Tone.State.Paused, time);
    }
    return this;
  }

  /**
	 *  Cancel start/stop/pause and setTickAtTime events scheduled after the given time.
	 *  @param {Time} [time=now] When to clear the events after
	 *  @returns {Tone.TickSource} this
	 */
  public cancel(time) {
    time = this.toSeconds(time);
    this._state.cancel(time);
    this._tickOffset.cancel(time);
    return this;
  }

  /**
	 * Get the elapsed ticks at the given time
	 * @param  {Time} time  When to get the tick value
	 * @return {Ticks}     The number of ticks
	 */
  public getTicksAtTime(time) {
    time = this.toSeconds(time);
    const stopEvent = this._state.getLastState(Tone.State.Stopped, time);
    // this event allows forEachBetween to iterate until the current time
    const tmpEvent = { state : Tone.State.Paused, time };
    this._state.add(tmpEvent);

    // keep track of the previous offset event
    let lastState = stopEvent;
    let elapsedTicks = 0;

    // iterate through all the events since the last stop
    this._state.forEachBetween(stopEvent.time, time + this.sampleTime, function(e) {
      let periodStartTime = lastState.time;
      // if there is an offset event in this period use that
      const offsetEvent = this._tickOffset.get(e.time);
      if (offsetEvent.time >= lastState.time) {
        elapsedTicks = offsetEvent.ticks;
        periodStartTime = offsetEvent.time;
      }
      if (lastState.state === Tone.State.Started && e.state !== Tone.State.Started) {
        elapsedTicks += this.frequency.getTicksAtTime(e.time) - this.frequency.getTicksAtTime(periodStartTime);
      }
      lastState = e;
    }.bind(this));

    // remove the temporary event
    this._state.remove(tmpEvent);

    // return the ticks
    return elapsedTicks;
  }

  /**
	 *  The number of times the callback was invoked. Starts counting at 0
	 *  and increments after the callback was invoked. Returns -1 when stopped.
	 *  @memberOf Tone.TickSource#
	 *  @name ticks
	 *  @type {Ticks}
	 */
  get ticks() {
    return this.getTicksAtTime(this.now());
  }

  set ticks(t: PrimitiveTicks) {
    this.setTicksAtTime(t, this.now());
  }

  /**
	 *  The time since ticks=0 that the TickSource has been running. Accounts
	 *  for tempo curves
	 *  @memberOf Tone.TickSource#
	 *  @name seconds
	 *  @type {Seconds}
	 */
  get seconds() {
    return this.getSecondsAtTime(this.now());
  }

  set seconds(s: PrimitiveTime) {
    const now = this.now();
    const ticks = this.frequency.timeToTicks(s, now);
    this.setTicksAtTime(ticks, now);
  }

  /**
	 *  Return the elapsed seconds at the given time.
	 *  @param  {Time}  time  When to get the elapsed seconds
	 *  @return  {Seconds}  The number of elapsed seconds
	 */
  public getSecondsAtTime(time: PrimitiveTime) {
    time = this.toSeconds(time);
    const stopEvent = this._state.getLastState(Tone.State.Stopped, time);
    // this event allows forEachBetween to iterate until the current time
    const tmpEvent = { state : 'paused', time };
    this._state.add(tmpEvent);

    // keep track of the previous offset event
    let lastState = stopEvent;
    let elapsedSeconds = 0;

    // iterate through all the events since the last stop
    this._state.forEachBetween(stopEvent.time, time + this.sampleTime, function(e) {
      let periodStartTime = lastState.time;
      // if there is an offset event in this period use that
      const offsetEvent = this._tickOffset.get(e.time);
      if (offsetEvent.time >= lastState.time) {
        elapsedSeconds = offsetEvent.seconds;
        periodStartTime = offsetEvent.time;
      }
      if (lastState.state === Tone.State.Started && e.state !== Tone.State.Started) {
        elapsedSeconds += e.time - periodStartTime;
      }
      lastState = e;
    }.bind(this));

    // remove the temporary event
    this._state.remove(tmpEvent);

    // return the ticks
    return elapsedSeconds;
  }

  /**
	 * Set the clock's ticks at the given time.
	 * @param  {Ticks} ticks The tick value to set
	 * @param  {Time} time  When to set the tick value
	 * @return {Tone.TickSource}       this
	 */
  public setTicksAtTime(ticks, time) {
    time = this.toSeconds(time);
    this._tickOffset.cancel(time);
    this._tickOffset.add({
      time,
      ticks,
      seconds : this.frequency.getDurationOfTicks(ticks, time),
    });
    return this;
  }

  /**
	 *  Returns the scheduled state at the given time.
	 *  @param  {Time}  time  The time to query.
	 *  @return  {String}  The name of the state input in setStateAtTime.
	 *  @example
	 * source.start("+0.1");
	 * source.getStateAtTime("+0.1"); //returns "started"
	 */
  public getStateAtTime(time) {
    time = this.toSeconds(time);
    return this._state.getValueAtTime(time);
  }

  /**
	 * Get the time of the given tick. The second argument
	 * is when to test before. Since ticks can be set (with setTicksAtTime)
	 * there may be multiple times for a given tick value.
	 * @param  {Ticks} ticks The tick number.
	 * @param  {Time=} before When to measure the tick value from.
	 * @return {Time}       The time of the tick
	 */
  public getTimeOfTick(tick, before) {
    before = Tone.defaultArg(before, this.now());
    const offset = this._tickOffset.get(before);
    const event = this._state.get(before);
    const startTime = Math.max(offset.time, event.time);
    const absoluteTicks = this.frequency.getTicksAtTime(startTime) + tick - offset.ticks;
    return this.frequency.getTimeOfTick(absoluteTicks);
  }

  /**
	 *  Invoke the callback event at all scheduled ticks between the
	 *  start time and the end time
	 *  @param  {Time}    startTime  The beginning of the search range
	 *  @param  {Time}    endTime    The end of the search range
	 *  @param  {ForEachCallback}  callback   The callback to invoke with each tick
	 *  @return  {Tone.TickSource}    this
	 */
  public forEachTickBetween(startTime, endTime, callback) {

    // only iterate through the sections where it is "started"
    let lastStateEvent = this._state.get(startTime);
    this._state.forEachBetween(startTime, endTime, function(event) {
      if (lastStateEvent.state === Tone.State.Started && event.state !== Tone.State.Started) {
        this.forEachTickBetween(Math.max(lastStateEvent.time, startTime), event.time - this.sampleTime, callback);
      }
      lastStateEvent = event;
    }.bind(this));

    startTime = Math.max(lastStateEvent.time, startTime);

    if (lastStateEvent.state === Tone.State.Started && this._state) {
      // figure out the difference between the frequency ticks and the
      const startTicks = this.frequency.getTicksAtTime(startTime);
      const ticksAtStart = this.frequency.getTicksAtTime(lastStateEvent.time);
      const diff = startTicks - ticksAtStart;
      let offset = diff % 1;
      if (offset !== 0) {
        offset = 1 - offset;
      }
      let nextTickTime = this.frequency.getTimeOfTick(startTicks + offset);
      let error = null;
      while (nextTickTime < endTime && this._state) {
        try {
          callback(nextTickTime, Math.round(this.getTicksAtTime(nextTickTime)));
        } catch (e) {
          error = e;
          break;
        }
        if (this._state) {
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
	 *  Clean up
	 *  @returns {Tone.TickSource} this
	 */
  public dispose = function() {
    Tone.Param.prototype.dispose.call(this);
    this._state.dispose();
    this._state = null;
    this._tickOffset.dispose();
    this._tickOffset = null;
    this._writable('frequency');
    this.frequency.dispose();
    this.frequency = null;
    return this;
  };
}
