import Tone from 'tone';
import { Emitter } from '@/modules/audio/Emitter';
import { mergeObjects, wrap } from '@/modules/audio/utils';
import { Ticks, TransportTime, ContextTime } from '@/modules/audio/types';
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

export class Clock extends Emitter<{ start: [number, number], stop: [number], pause: [number] }> {
  private callback: Callback;
  private tickSource = new TickSource({ frequency: defaults.frequency });
  private timeline = new TimelineState('stopped');
  private lastUpdate = 0;
  private boundLoop = this.loop.bind(this);

  // tslint:disable
  public readonly seconds = wrap(this.tickSource, 'seconds');
  public readonly frequency = this.tickSource.frequency;
  // tslint:enable

  constructor(opts?: Options) {
    super();

    const options = mergeObjects(opts, defaults);
    this.frequency.value = options.frequency;
    this.callback = options.callback;

    // bind a callback to the worker thread
    Context.context.value.on('tick', this.boundLoop);
  }

  get state() {
    return this.timeline.getValueAtTime(Context.now());
  }

  get ticks() {
    return Math.ceil(this.getTicksAtTime(Context.now()));
  }

  set ticks(t: number) {
    this.tickSource.ticks = t;
  }

  public start(time?: ContextTime, offset?: Ticks) {
    // make sure the context is started
    Context.resume();
    // start the loop
    const seconds = Context.toSeconds(time);
    if (this.timeline.getValueAtTime(seconds) !== 'started') {
      this.timeline.setStateAtTime({
        state: 'started',
        time: seconds,
      });
      this.tickSource.start(seconds, offset);

      if (seconds < this.lastUpdate) {
        this.emit('start', seconds, offset);
      }
    }
    return this;
  }

  public pause(time?: TransportTime) {
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

  public stop(time?: TransportTime) {
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

  public getTicksAtTime(time: TransportTime) {
    return this.tickSource.getTicksAtTime(time);
  }

  public setTicksAtTime(ticks: Ticks, time: TransportTime) {
    this.tickSource.setTicksAtTime(ticks, time);
    return this;
  }

  public getSecondsAtTime(time: TransportTime) {
    return this.tickSource.getSecondsAtTime(time);
  }

  public dispose() {
    Context.context.value.off('tick', this.boundLoop);
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
          const offset = this.tickSource.getTicksAtTime(e.time);
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
    this.tickSource.forEachTickBetween(startTime, endTime, this.callback);
  }
}
