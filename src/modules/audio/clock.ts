import Tone from 'tone';
import { Time, Ticks } from '@/modules/audio/types';
import { Emitter } from '@/modules/audio/emitter';
import { mergeObjects } from '@/modules/audio/checks';

interface Options {
  callback?: () => void;
  frequency?: number;
}

const defaults = {
  callback: () => {
    //
  },
  frequency: 1,
};

export class Clock extends Emitter<{ start: [number, number], stop: [number], pause: [number] }> {
  public callback: (time: Time, ticks: Ticks) => void;
  // tslint:disable-next-line:variable-name
  private _nextTick = 0;
  // tslint:disable-next-line:variable-name
  private _tickSource: Tone.TickSource;
  // tslint:disable-next-line:variable-name
  private _lastUpdate = 0;
  // tslint:disable-next-line:variable-name
  private _state = new Tone.TimelineState('stopped');
  // tslint:disable-next-line:variable-name
  private _boundLoop: () => void;
  // tslint:disable-next-line:member-ordering
  public readonly frequency: Tone.TickSignal;

  constructor(opts?: Options) {
    super();
    const options = mergeObjects(defaults, opts);
    this.callback = options.callback;
    this._tickSource = new Tone.TickSource(options.frequency);
    this.frequency = this._tickSource.frequency;

    // add an initial state
    this._state.setStateAtTime('stopped', 0);

    this._boundLoop = this._loop.bind(this);

    // bind a callback to the worker thread
    (this as any).context.on('tick', this._boundLoop);
  }

  /**
   *  Returns the playback state of the source, either "started", "stopped" or "paused".
   *  @type {Tone.State}
   *  @readOnly
   *  @memberOf Tone.Clock#
   *  @name state
   */
  get state() {
    return this._state.getValueAtTime((this as any).now());
  }

  /**
   *  The number of times the callback was invoked. Starts counting at 0
   *  and increments after the callback was invoked.
   *  @type {Ticks}
   */
  get ticks() {
    return Math.ceil(this.getTicksAtTime((this as any).now()));
  }

  set ticks(t: number) {
    this._tickSource.ticks = t;
  }

  /**
   *  The time since ticks=0 that the Clock has been running. Accounts
   *  for tempo curves
   *  @type {Seconds}
   */
  get seconds() {
    return this._tickSource.seconds;
  }

  set seconds(s: number) {
    this._tickSource.seconds = s;
  }

  /**
   *  Start the clock at the given time. Optionally pass in an offset
   *  of where to start the tick counter from.
   *  @param  {Time=}  time    The time the clock should start
   *  @param  {Ticks=}  offset  Where the tick counter starts counting from.
   *  @return  {Tone.Clock}  this
   */
  public start(time: Time, offset: Ticks) {
    // make sure the context is started
    this.context.resume();
    // start the loop
    const seconds = this.toSeconds(time);
    if (this._state.getValueAtTime(seconds) !== 'started') {
      this._state.setStateAtTime('started', seconds);
      this._tickSource.start(seconds, offset);
      if (seconds < this._lastUpdate) {
        this.emit('start', seconds, offset);
      }
    }
    return this;
  }

  /**
   *  Stop the clock. Stopping the clock resets the tick counter to 0.
   *  @param {Time} [time=now] The time when the clock should stop.
   *  @returns {Tone.Clock} this
   *  @example
   * clock.stop();
   */
  public stop(time: Time) {
    const seconds = this.toSeconds(time);
    this._state.cancel(seconds);
    this._state.setStateAtTime('stopped', seconds);
    this._tickSource.stop(seconds);
    if (seconds < this._lastUpdate) {
      this.emit('stop', seconds);
    }
    return this;
  }

  /**
   *  Pause the clock. Pausing does not reset the tick counter.
   *  @param {Time} [time=now] The time when the clock should stop.
   *  @returns {Tone.Clock} this
   */
  public pause(time: Time) {
    time = this.toSeconds(time);
    if (this._state.getValueAtTime(time) === 'started') {
      this._state.setStateAtTime('paused', time);
      this._tickSource.pause(time);
      if (time < this._lastUpdate) {
        this.emit('pause', time);
      }
    }
    return this;
  }

  /**
   *  Return the elapsed seconds at the given time.
   *  @param  {Time}  time  When to get the elapsed seconds
   *  @return  {Seconds}  The number of elapsed seconds
   */
  public getSecondsAtTime(time: Time) {
    return this._tickSource.getSecondsAtTime(time);
  }

  /**
   * Set the clock's ticks at the given time.
   * @param  {Ticks} ticks The tick value to set
   * @param  {Time} time  When to set the tick value
   * @return {Tone.Clock}       this
   */
  public setTicksAtTime(ticks: Ticks, time: Time) {
    this._tickSource.setTicksAtTime(ticks, time);
    return this;
  }

  /**
   * Get the clock's ticks at the given time.
   * @param  {Time} time  When to get the tick value
   * @return {Ticks}       The tick value at the given time.
   */
  public getTicksAtTime(time: Time) {
    return this._tickSource.getTicksAtTime(time);
  }

  /**
   * Get the time of the next tick
   * @param  {Ticks} ticks The tick number.
   * @param  {Time} before
   * @return {Tone.Clock}       this
   */
  public nextTickTime(offset: Ticks, when: Time) {
    when = this.toSeconds(when);
    const currentTick = this.getTicksAtTime(when);
    return this._tickSource.getTimeOfTick(currentTick + offset, when);
  }

  /**
   *  Returns the scheduled state at the given time.
   *  @param  {Time}  time  The time to query.
   *  @return  {String}  The name of the state input in setStateAtTime.
   *  @example
   * clock.start("+0.1");
   * clock.getStateAtTime("+0.1"); //returns "started"
   */
  public getStateAtTime(time: Time) {
    time = this.toSeconds(time);
    return this._state.getValueAtTime(time);
  }

  /**
   *  Clean up
   *  @returns this
   */
  public dispose() {
    super.dispose();
    this.context.off('tick', this._boundLoop);
    // this._writable('frequency');
    this._tickSource.dispose();
    // this._tickSource = null;
    // this.frequency = null;
    // this._boundLoop = null;
    this._nextTick = Infinity;
    // this.callback = null;
    this._state.dispose();
    // this._state = null;
    return this;
  }

  /**
   *  The scheduling loop.
   *  @private
   */
  private _loop() {

    const startTime = this._lastUpdate;
    const endTime = (this as any).now();
    this._lastUpdate = endTime;

    if (startTime !== endTime) {
      // the state change events
      this._state.forEachBetween(startTime, endTime, (e) => {
        switch (e.state) {
          case 'started' :
            const offset = this._tickSource.getTicksAtTime(e.time);
            this.emit('start', e.time, offset);
            break;
          case 'stopped' :
            if (e.time !== 0) {
              this.emit('stop', e.time);
            }
            break;
          case 'paused' :
            this.emit('pause', e.time);
            break;
        }
      });
      // the tick callbacks
      this._tickSource.forEachTickBetween(startTime, endTime, (time, ticks) => {
        this.callback(time, ticks);
      });
    }
  }
}
