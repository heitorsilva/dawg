import Tone from 'tone';
import { ContextTime, TransportTime, Time, TransportSeconds, Ticks } from '@/modules/audio/types';
import { StrictEventEmitter } from '@/base/events';
import { Clock } from '@/modules/audio/Clock';
import { Context } from '@/modules/audio/Context';
import { TickSignal } from '@/modules/audio/TickSignal';

// An interface doesn't work for some reason
// tslint:disable-next-line:interface-over-type-literal
type Events = {
  start: [ContextTime, TransportSeconds];
  stop: [ContextTime];
  pause: [ContextTime];
  loopStart: [ContextTime, TransportSeconds];
  loopEnd: [ContextTime];
  loop: [ContextTime];
};

Tone.TransportRepeatEvent.prototype._createEvents = function(time) {
  // schedule the next event
  const ticks = this.Transport.getTicksAtTime(time);

  // @ts-ignore
  if (ticks >= this.time && ticks >= this._nextTick && this._nextTick + this._interval < this.time + this.duration) {
    // @ts-ignore
    this._nextTick += this._interval;
    // @ts-ignore
    this._currentId = this._nextId;
    // @ts-ignore
    this._nextId = this.Transport.scheduleOnce(this.invoke.bind(this), Tone.Ticks(this._nextTick));
  }
};


// A little hack to pass on time AND ticks
Tone.TransportEvent.prototype.invoke = function(time, ticks) {
  if (this.callback) {
    this.callback(time, ticks);
    if (this._once && this.Transport) {
      this.Transport.clear(this.id);
    }
  }
};

Tone.TransportRepeatEvent.prototype.invoke = function(time, ticks) {
  // create more events if necessary
  this._createEvents(time);
  // call the super class
  Tone.TransportEvent.prototype.invoke.call(this, time, ticks);
};

type Event = Tone.TransportEvent | Tone.TransportRepeatEvent;

export default class Transport extends StrictEventEmitter<Events> {
  public loop = true;
  public timeline = new Tone.Timeline<Event>();
  public bpm: TickSignal;
  /**
   * Measured in ticks.
   */
  private startPosition: Ticks = 0;

  private ppq = 192;
  // tslint:disable-next-line:variable-name
  private _loopStart: Ticks = 0;
  // tslint:disable-next-line:variable-name
  private _loopEnd: Ticks = 0;
  private clock = new Clock({
    callback: this.processTick.bind(this),
    frequency: 0,
  });
  private scheduledEvents: { [id: string]: Event } = {};

  constructor() {
    super();

    this.bpm = this.clock.frequency;
    this.bpm.toUnits = (freq: number) => {
      return (freq / this.PPQ) * 60;
    };

    this.bpm.fromUnits = (bpm: number) => {
      return 1 / (60 / bpm / this.PPQ);
    };

    this.bpm.value = 120;


    this.clock.on('start', (time, ticks) => {
      ticks = new Tone.Ticks(ticks).toSeconds();
      this.emit('start', time, ticks);
    });

    this.clock.on('stop', (time) => {
      this.emit('stop', time);
    });

    this.clock.on('pause', (time) => {
      this.emit('pause', time);
    });
  }

  get loopStart() {
    return new Tone.Ticks(this._loopStart).toSeconds();
  }

  set loopStart(loopStart: number) {
    this._loopStart = Context.toTicks(loopStart);
    this.seconds = loopStart;
  }

  get seconds() {
    return this.clock.seconds.value;
  }

  set seconds(s: number) {
    const now = Tone.Transport.context.now();
    const ticks = this.clock.frequency.timeToTicks(s, now);
    this.ticks = ticks.toTicks();
  }

  get loopEnd() {
    return new Tone.Ticks(this._loopEnd).toSeconds();
  }

  set loopEnd(loopEnd: number) {
    this._loopEnd = Context.toTicks(loopEnd);
  }

  get ticks() {
    return this.clock.ticks.value;
  }


  set ticks(t: number) {
    if (this.clock.ticks.value !== t) {
      const now = Tone.Transport.context.now();
      // stop everything synced to the transport
      if (this.state === 'started') {
        // restart it with the new time
        this.emit('stop', now);
        this.clock.setTicksAtTime({ ticks: t, time: now });
        this.emit('start', now, this.seconds);
      } else {
        this.clock.setTicksAtTime({ ticks: t, time: now });
      }

      this.startPosition = t;
    }
  }

  get beats() {
    return this.ticks / this.PPQ;
  }

  get PPQ() {
    return this.ppq;
  }

  set PPQ(ppq: number) {
    const bpm = this.bpm;
    this.ppq = ppq;
    this.bpm = bpm;
  }

  get state() {
    return this.clock.state;
  }

  get progress() {
    if (this.loop) {
      const now = Tone.Transport.context.now();
      const ticks = this.clock.getTicksAtTime(now);
      return (ticks - this._loopStart) / (this._loopEnd - this._loopStart);
    } else {
      return 0;
    }
  }

  /**
   * Schedule an event.
   */
  public schedule(callback: Tone.TransportCallback, time: TransportTime) {
    // @ts-ignore
    const event = new Tone.TransportEvent(this, {
      time: new Tone.TransportTime(time),
      callback,
    });

    return this.addEvent(event);
  }

  public scheduleRepeat(
    callback: Tone.TransportCallback,
    interval: Time,
    startTime: TransportTime = 0,
    duration: Time = Infinity,
  ) {
    const event = new Tone.TransportRepeatEvent(this as any, {
      callback,
      interval: new Tone.Time(interval),
      time: new Tone.TransportTime(startTime),
      duration: new Tone.Time(duration),
    });

    return this.addEvent(event);
  }

  public embed(child: Transport, time: TransportTime, duration: TransportTime) {
    const t = new Tone.Time(time);
    const ticksOffset = t.toTicks();

    const callback = (exact: number, ticks: number) => {
      child.processTick(exact, ticks - ticksOffset);
    };

    return this.scheduleRepeat(callback, '1i', time, duration);
  }

  public clear(eventId: string) {
    if (this.scheduledEvents.hasOwnProperty(eventId)) {
      const event = this.scheduledEvents[eventId];
      this.timeline.remove(event);
      event.dispose();
      delete this.scheduledEvents[eventId];
    }
    return this;
  }

  /**
   * Start playback from current position.
   */
  public start(time?: ContextTime, offset?: TransportTime) {
    offset = offset === undefined ? 0 : Context.toTicks(offset);

    if (time === undefined) {
      time = Context.now();
    }

    this.clock.start(time, offset);
    return this;
  }

  /**
   * Pause playback.
   */
  public pause(time?: ContextTime) {
    this.clock.pause(time);
    return this;
  }

  /**
   * Stop playback and return to the beginning.
   */
  public stop(time?: ContextTime) {
    this.clock.stop(time);
    this.ticks = this.startPosition;
    return this;
  }

  public setLoopPoints(loopStart: number, loopEnd: number) {
    this.loopStart = loopStart;
    this.loopEnd = loopEnd;
    return this;
  }

  public get(eventId: string) {
    return this.scheduledEvents[eventId];
  }

  public getTicksAtTime(time: number) {
    return Math.round(this.clock.getTicksAtTime(time));
  }

  public scheduleOnce(callback: Tone.TransportCallback, time: TransportTime) {
    // @ts-ignore
    const event = new Tone.TransportEvent(this, {
      time : new Tone.TransportTime(time),
      callback,
      once : true,
    });
    return this.addEvent(event);
  }

  public getSecondsAtTime(time: ContextTime) {
    return this.clock.getSecondsAtTime(time);
  }

  private processTick(exact: ContextTime, ticks: number) {

    // do the loop test
    if (this.loop) {
      if (ticks >= this._loopEnd) {
        this.emit('loopEnd', exact);
        this.clock.setTicksAtTime({ ticks: this._loopStart, time: exact });
        ticks = this._loopStart;
        this.emit('loopStart', exact, this.clock.getSecondsAtTime(exact));
        this.emit('loop', exact);
      }
    }

    // invoke the timeline events scheduled on this tick
    this.timeline.forEachAtTime(ticks, (event) => {
      event.invoke(exact, ticks);
    });
  }

  private addEvent(event: Event) {
    this.timeline.add(event);
    this.scheduledEvents[event.id.toString()] = event;
    return event.id;
  }
}

export {
  Transport,
};
