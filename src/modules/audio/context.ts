import Tone from 'tone';
import { Emitter } from '@/modules/audio/emitter';
import { mergeObjects } from '@/modules/audio/checks';

// import Tone from 'tone';

// @ts-ignore
// export const context = Tone.context._context as unknown as AudioContext;

// var AudioContextProperties = ["baseLatency", "destination", "currentTime", "sampleRate", "listener", "state"];
// var AudioContextMethods = ["suspend", "close", "resume", "getOutputTimestamp", "createMediaElementSource", "createMediaStreamSource", "createMediaStreamDestination", "createBuffer", "decodeAudioData", "createBufferSource", "createConstantSource", "createGain", "createDelay", "createBiquadFilter", "createIIRFilter", "createWaveShaper", "createPanner", "createConvolver", "createDynamicsCompressor", "createAnalyser", "createScriptProcessor", "createStereoPanner", "createOscillator", "createPeriodicWave", "createChannelSplitter", "createChannelMerger", "audioWorklet"];

interface Options {
  clockSource: 'worker';
  latencyHint: LatencyHit;
  lookAhead: number;
  updateInterval: number;
}

const defaults: Options = {
  clockSource: 'worker',
  latencyHint : 'interactive',
  lookAhead : 0.1,
  updateInterval : 0.03,
};

type LatencyHit = 'interactive' | 'playback' | 'balanced' | 'fastest';

export class Context extends Emitter<{ tick: [], statechange: [Event], close: [] }> {
  public rawContext = new AudioContext();
  // tslint:disable-next-line:variable-name
  private _latencyHit: LatencyHit;
  private lookAhead: number;
  private computedUpdateInterval = 0;
  private ticker: Ticker;
  // tslint:disable-next-line:variable-name
  private _timeouts = new Tone.Timeline<{ time: number, callback: () => void, id: number }>();
  // tslint:disable-next-line:variable-name
  private _timeoutIds = 0;

  constructor(opts?: Partial<Options>) {
    super();

    const options = mergeObjects(defaults, opts);
    // TODO
    // extend all of the properties
    // AudioContextProperties.forEach(function(prop){
    //   this._defineProperty(this._context, prop);
    // }.bind(this));
    // // extend all of the methods
    // AudioContextMethods.forEach(function(method){
    //   this._defineMethod(this._context, method);
    // }.bind(this));
    this._latencyHit = options.latencyHint;

    /**
     *  The amount of time events are scheduled
     *  into the future
     *  @type  {Number}
     */
    this.lookAhead = options.lookAhead;

    /**
     *  A reliable callback method
     *  @private
     *  @type  {Ticker}
     */
    this.ticker = new Ticker(
      options.clockSource,
      options.updateInterval,
      this.emit.bind(this, 'tick'),
    );

    this.on('tick', this._timeoutLoop.bind(this));

    // forward state change events
    this.rawContext.onstatechange = (e) => {
      this.emit('statechange', e);
    };
  }

  /**
   *  The current audio context time
   *  @return  {Number}
   */
  public now() {
    return this.rawContext.currentTime + this.lookAhead;
  }

  /**
   *  The audio output destination. Alias for Tone.Master
   *  @readyOnly
   *  @type  {Tone.Master}
   */
  get destination() {
    if (!this.master) {
      return this.rawContext.destination;
    } else {
      return this.master;
    }
  }

  /**
   *  Starts the audio context from a suspended state. This is required
   *  to initially start the AudioContext.
   *  @return  {Promise}
   */
  public resume() {
    if (this.rawContext.state === 'suspended') {
      return this.rawContext.resume();
    } else {
      return Promise.resolve();
    }
  }

  /**
   *  Promise which is invoked when the context is running.
   *  Tries to resume the context if it's not started.
   *  @return  {Promise}
   */
  public close() {
    let closePromise = Promise.resolve();
    // never close the global Tone.Context
    // if (this !== Tone.global.TONE_AUDIO_CONTEXT) {
    closePromise = this.rawContext.close();
    // }
    return closePromise.then(() => {
      this.emit('close', this);
    });
  }

  /**
   *  Generate a looped buffer at some constant value.
   *  @param  {Number}  val
   *  @return  {BufferSourceNode}
   */
  // public getConstant(val: number) {
  //   if (this._constants[val]) {
  //     return this._constants[val];
  //   } else {
  //     const buffer = this._context.createBuffer(1, 128, this._context.sampleRate);
  //     const arr = buffer.getChannelData(0);
  //     for (let i = 0; i < arr.length; i++) {
  //       arr[i] = val;
  //     }
  //     const constant = this._context.createBufferSource();
  //     constant.channelCount = 1;
  //     constant.channelCountMode = 'explicit';
  //     constant.buffer = buffer;
  //     constant.loop = true;
  //     constant.start(0);
  //     this._constants[val] = constant;
  //     return constant;
  //   }
  // }

  /**
   *  A setTimeout which is gaurenteed by the clock source.
   *  Also runs in the offline context.
   *  @param  {Function}  fn       The callback to invoke
   *  @param  {Seconds}    timeout  The timeout in seconds
   *  @returns {Number} ID to use when invoking Tone.Context.clearTimeout
   */
  public setTimeout(fn: () => void, timeout: number) {
    this._timeoutIds++;
    const now = this.now();
    this._timeouts.add({
      callback: fn,
      time: now + timeout,
      id: this._timeoutIds,
    });
    return this._timeoutIds;
  }

  /**
   *  Clears a previously scheduled timeout with Tone.context.setTimeout
   *  @param  {Number}  id  The ID returned from setTimeout
   *  @return  {Tone.Context}  this
   */
  public clearTimeout(id: number) {
    this._timeouts.forEach((event) => {
      if (event.id === id) {
        this.remove(event);
      }
    });
    return this;
  }

  /**
   *  Unlike other dispose methods, this returns a Promise
   *  which executes when the context is closed and disposed
   *  @returns {Promise} this
   */
  public dispose() {
    super.dispose();
    return this;
    // return this.close().then(function(){
    //   Tone.Emitter.prototype.dispose.call(this);
    //   this._ticker.dispose();
    //   this._ticker = null;
    //   this._timeouts.dispose();
    //   this._timeouts = null;
    //   for (var con in this._constants){
    //     this._constants[con].disconnect();
    //   }
    //   this._constants = null;
    // }.bind(this));
  }

  /**
   *  The private loop which keeps track of the context scheduled timeouts
   *  Is invoked from the clock source
   */
  private _timeoutLoop() {
    const now = this.now();
    while (this._timeouts.length && this._timeouts.peek().time <= now) {
      this._timeouts.shift().callback();
    }
  }

  /**
   *  How often the Web Worker callback is invoked.
   *  This number corresponds to how responsive the scheduling
   *  can be. Context.updateInterval + Context.lookAhead gives you the
   *  total latency between scheduling an event and hearing it.
   *  @type {Number}
   *  @memberOf Tone.Context#
   *  @name updateInterval
   */
  get updateInterval() {
    return this.ticker.updateInterval;
  }

  set updateInterval(interval) {
    this.ticker.updateInterval = interval;
  }

  /**
   *  What the source of the clock is, either "worker" (Web Worker [default]),
   *  "timeout" (setTimeout), or "offline" (none).
   *  @type {String}
   *  @memberOf Tone.Context#
   *  @name clockSource
   */
  get clockSource() {
    return this.ticker.type;
  }

  set clockSource(type) {
    this.ticker.type = type;
  }

  /**
   *  The type of playback, which affects tradeoffs between audio
   *  output latency and responsiveness.
   *
   *  In addition to setting the value in seconds, the latencyHint also
   *  accepts the strings "interactive" (prioritizes low latency),
   *  "playback" (prioritizes sustained playback), "balanced" (balances
   *  latency and performance), and "fastest" (lowest latency, might glitch more often).
   *  @type {String|Seconds}
   *  @memberOf Tone.Context#
   *  @name latencyHint
   *  @example
   * //set the lookAhead to 0.3 seconds
   * Tone.context.latencyHint = 0.3;
   */
  get latencyHit() {
    return this._latencyHit;
  }

  set latencyHit(hint: string) {
    let lookAhead = 0;
    this.latencyHit = hint;
    switch (hint) {
      case 'interactive' :
        lookAhead = 0.1;
        this.rawContext.latencyHint = hint;
        break;
      case 'playback' :
        lookAhead = 0.8;
        this.rawContext.latencyHint = hint;
        break;
      case 'balanced' :
        lookAhead = 0.25;
        this.rawContext.latencyHint = hint;
        break;
      case 'fastest' :
        this.rawContext.latencyHint = 'interactive';
        lookAhead = 0.01;
        break;
    }
    this.lookAhead = lookAhead;
    this.updateInterval = lookAhead / 3;
  }
}

type WorkerType = 'worker' | 'timeout' | 'offline';

class Ticker {
  private worker: Worker | null = null;
  private timeout: NodeJS.Timeout | null = null;

  constructor(
    // tslint:disable-next-line:variable-name
    private _type: WorkerType,
    // tslint:disable-next-line:variable-name
    private _updateInterval: number,
    private callback: () => void,
  ) {
  this.createClock();
  }

  public dispose() {
    // this._disposeClock();
    // this.callback = null;
  }

  private createWorker() {
    const blob = new Blob([
      // the initial timeout time
      'var timeoutTime = ' + (this._updateInterval * 1000).toFixed(1) + ';' +
      // onmessage callback
      'self.onmessage(msg){' +
      '	timeoutTime = parseInt(msg.data);' +
      '};' +
      // the tick function which posts a message
      // and schedules a new tick
      'function tick(){' +
      '	setTimeout(tick, timeoutTime);' +
      '	self.postMessage(\'tick\');' +
      '}' +
      // call tick initially
      'tick();',
    ]);

    const blobUrl = URL.createObjectURL(blob);
    const worker = new Worker(blobUrl);

    worker.onmessage = this.callback.bind(this);
    this.worker = worker;
  }

  private createTimeout() {
    this.timeout = setTimeout(() => {
      this.createTimeout();
      this.callback();
    }, this._updateInterval * 1000);
  }

  private createClock() {
    if (this._type === 'worker') {
      try {
        this.createWorker();
      } catch (e) {
        // workers not supported, fallback to timeout
        this._type = 'timeout';
        this.createClock();
      }
    } else if (this._type === 'timeout') {
      this.createTimeout();
    }
  }

  private disposeClock() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker.onmessage = null;
      this.worker = null;
    }
  }

  get updateInterval() {
    return this._updateInterval;
  }

  set updateInterval(interval: number) {
    this._updateInterval = Math.max(interval, 128 / 44100);
    if (this.worker && this.type === 'worker') {
      this.worker.postMessage(Math.max(interval * 1000, 1));
    }
  }

  get type() {
    return this._type;
  }

  set type(type: WorkerType) {
    this.disposeClock();
    this._type = type;
    this.createClock();
  }
}
