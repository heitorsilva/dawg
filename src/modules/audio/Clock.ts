import { StrictEventEmitter } from '@/base/events';
import { mergeObjects, wrap } from '@/modules/audio/utils';
import { Ticks, ContextTime } from '@/modules/audio/types';
import { Context } from '@/modules/audio/Context';
import { TimelineState } from '@/modules/audio/TimelineState';
import { TickSource } from '@/modules/audio/TickSource';

type Callback = (time: ContextTime, ticks: Ticks) => void;

interface Options {
  callback?: Callback;
  frequency?: number;
}

const defaults = {
  callback: () => {
    //
  },
  frequency: 1,
};

export class Clock extends StrictEventEmitter<
  { start: [ContextTime, Ticks], stop: [ContextTime], pause: [ContextTime] }
> {
  private callback: Callback;
  private tickSource = new TickSource({ frequency: defaults.frequency });
  private timeline = new TimelineState('stopped');
  private lastUpdate = 0;
  private disposer: { dispose: () => void };

  // tslint:disable
  public readonly seconds = wrap(this.tickSource, 'seconds');
  public readonly ticks = wrap(this.tickSource, 'ticks');
  public readonly frequency = this.tickSource.frequency;
  public readonly getTicksAtTime = this.tickSource.getTicksAtTime;
  public readonly setTicksAtTime = this.tickSource.setTicksAtTime;
  public readonly getSecondsAtTime = this.tickSource.getSecondsAtTime;
  // tslint:enable

  constructor(opts?: Options) {
    super();

    const options = mergeObjects(opts, defaults);
    this.frequency.value = options.frequency;
    this.callback = options.callback;

    // bind a callback to the worker thread
    this.disposer = Context.onDidTick(this.loop.bind(this));
  }

  get state() {
    return this.timeline.getValueAtTime(Context.now());
  }

  /**
   *  Start the clock at the given time. Optionally pass in an offset
   *  of where to start the tick counter from.
   *  @param time The time the clock should start
   *  @param  offset Where the tick counter starts counting from.
   *  @return this
   */
  public start(time?: ContextTime, offset: Ticks = 0) {
    // make sure the context is started
    Context.resume();

    // start the loop
    const seconds = Context.toSeconds(time);
    if (this.timeline.getValueAtTime(seconds) !== 'started') {
      this.timeline.setStateAtTime({
        state: 'started',
        time: seconds,
      });
      this.tickSource.start(seconds, { offset });

      if (seconds < this.lastUpdate) {
        this.emit('start', seconds, offset);
      }
    }
    return this;
  }

  public pause(time?: ContextTime) {
    time = Context.toSeconds(time);
    if (this.timeline.getValueAtTime(time) === 'started') {
      this.timeline.setStateAtTime({
        state: 'paused',
        time,
      });
      this.tickSource.pause(time);

      if (time < this.lastUpdate) {
        this.emit('pause', time);
      }
    }
    return this;
  }

  public stop(time?: ContextTime) {
    const seconds = Context.toSeconds(time);
    this.timeline.cancel(seconds);
    this.timeline.setStateAtTime({
      state: 'stopped',
      time: seconds,
    });
    this.tickSource.stop(seconds);
    if (seconds < this.lastUpdate) {
      this.emit('stop', seconds);
    }
    return this;
  }

  public dispose() {
    this.disposer.dispose();
    return this;
  }

  private loop() {
    const startTime = this.lastUpdate;
    const endTime = Context.now();
    this.lastUpdate = endTime;

    if (startTime === endTime) {
      return;
    }

    // the state change events
    this.timeline.forEachBetween(startTime, endTime, (e) => {
      switch (e.state) {
        case 'started' :
          const ticks = this.tickSource.getTicksAtTime(e.time);
          this.emit('start', e.time, ticks);
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
    this.tickSource.forEachTickBetween(startTime, endTime, this.callback);
  }
}
