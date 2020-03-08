import { Seconds, NormalRange, ContextTime } from '@/lib/audio/types';
import { context as c } from '@/lib/audio/online';
import { defineProperties } from '@/lib/std';
import { createConstantSource } from '@/lib/audio/constant-source';
import { createOfflineContext } from '@/lib/audio/offline';
import { EnhancedContext } from '@/lib/audio/context';
import { createGain } from '@/lib/audio/gain';

export interface EnvelopeOptions {
  /**
   * When triggerAttack is called, the attack time is the amount of
   * time it takes for the envelope to reach it's maximum value.
   * ```
   *           /\
   *          /X \
   *         /XX  \
   *        /XXX   \
   *       /XXXX    \___________
   *      /XXXXX                \
   *     /XXXXXX                 \
   *    /XXXXXXX                  \
   *   /XXXXXXXX                   \
   * ```
   * @min 0
   * @max 2
   */
  attack: Seconds;

  /**
   * After the attack portion of the envelope, the value will fall
   * over the duration of the decay time to it's sustain value.
   * ```
   *           /\
   *          / X\
   *         /  XX\
   *        /   XXX\
   *       /    XXXX\___________
   *      /     XXXXX           \
   *     /      XXXXX            \
   *    /       XXXXX             \
   *   /        XXXXX              \
   * ```
   * @min 0
   * @max 2
   */
  decay: Seconds;

  /**
   * The sustain value is the value
   * which the envelope rests at after triggerAttack is
   * called, but before triggerRelease is invoked.
   * ```
   *           /\
   *          /  \
   *         /    \
   *        /      \
   *       /        \___________
   *      /          XXXXXXXXXXX\
   *     /           XXXXXXXXXXX \
   *    /            XXXXXXXXXXX  \
   *   /             XXXXXXXXXXX   \
   * ```
   */
  sustain: NormalRange;

  /**
   * After triggerRelease is called, the envelope's
   * value will fall to it's miminum value over the
   * duration of the release time.
   * ```
   *           /\
   *          /  \
   *         /    \
   *        /      \
   *       /        \___________
   *      /                    X\
   *     /                     XX\
   *    /                      XXX\
   *   /                       XXXX\
   * ```
   * @min 0
   * @max 5
   */
  release: Seconds;

  attackCurve: InternalEnvelopeCurve;
  releaseCurve: InternalEnvelopeCurve;
  decayCurve: BasicEnvelopeCurve;

  // TODO generalize
  context?: EnhancedContext;
}

/**
 * Envelope is an [ADSR](https://en.wikipedia.org/wiki/Synthesizer#ADSR_envelope)
 * envelope generator. Envelope outputs a signal which
 * can be connected to an AudioParam or Tone.Signal.
 * ```
 *           /\
 *          /  \
 *         /    \
 *        /      \
 *       /        \___________
 *      /                     \
 *     /                       \
 *    /                         \
 *   /                           \
 * ```
 */
export const createEnvelope = (options?: Partial<EnvelopeOptions>) => {
  const attack = options?.attack ?? 0.01;
  const decay = options?.decay ?? 0.1;
  const sustain = options?.sustain ?? 1;
  const release = options?.release ?? 0.5;
  const attackCurve = options?.attackCurve ?? 'linear';
  const releaseCurve = options?.releaseCurve ?? 'exponential';
  const decayCurve = options?.decayCurve ?? 'exponential';
  const sig = createConstantSource();
  sig.output.value = 0;
  const context = options?.context ?? c;

  /**
   * Trigger the attack/decay portion of the ADSR envelope.
   * @param  time When the attack should start.
   * @param velocity The velocity of the envelope scales the vales.
   */
  const triggerAttack = (time?: ContextTime, velocity: NormalRange = 1) => {
    time = time ?? context.now();
    let att = attack;

    // check if it's not a complete attack
    const currentValue = sig.output.getValueAtTime(time);
    if (currentValue > 0) {
      // subtract the current value from the attack time
      const attackRate = 1 / att;
      const remainingDistance = 1 - currentValue;
      // the att is now the remaining time
      att = remainingDistance / attackRate;
    }
    // att
    if (att < context.sampleTime) {
      sig.output.cancelScheduledValues(time);
      // case where the att time is 0 should set instantly
      sig.output.setValueAtTime(velocity, time);
    } else if (attackCurve === 'linear') {
      sig.output.linearRampTo(velocity, att, time);
    } else if (attackCurve === 'exponential') {
      sig.output.targetRampTo(velocity, att, time);
    } else {
      sig.output.cancelAndHoldAtTime(time);
      let curve = attackCurve;
      // find the starting position in the curve
      for (let i = 1; i < curve.length; i++) {
        // the starting index is between the two values
        if (curve[i - 1] <= currentValue && currentValue <= curve[i]) {
          curve = attackCurve.slice(i);
          // the first index is the current value
          curve[0] = currentValue;
          break;
        }
      }
      sig.output.setValueCurveAtTime(curve, time, att, velocity);
    }
    // decay
    if (decay && sustain < 1) {
      const decayValue = velocity * sustain;
      const decayStart = time + att;
      if (decayCurve === 'linear') {
        sig.output.linearRampToValueAtTime(decayValue, decay + decayStart);
      } else {
        sig.output.exponentialApproachValueAtTime(decayValue, decayStart, decay);
      }
    }
  };

  /**
   * Triggers the release of the envelope.
   * @param  time When the release portion of the envelope should start.
   */
  const triggerRelease = (time?: ContextTime) => {
    time = time ?? context.now();
    const currentValue = getValueAtTime(time);
    if (currentValue > 0) {
      if (release < context.sampleTime) {
        sig.output.setValueAtTime(0, time);
      } else if (releaseCurve === 'linear') {
        sig.output.linearRampTo(0, release, time);
      } else if (releaseCurve === 'exponential') {
        sig.output.targetRampTo(0, release, time);
      } else {
        sig.output.cancelAndHoldAtTime(time);
        sig.output.setValueCurveAtTime(releaseCurve, time, release, currentValue);
      }
    }
  };

  /**
   * triggerAttackRelease is shorthand for triggerAttack, then waiting
   * some duration, then triggerRelease.
   * @param duration The duration of the sustain.
   * @param time When the attack should be triggered.
   * @param velocity The velocity of the envelope.
   */
  const triggerAttackRelease = (duration: Seconds, time?: ContextTime, velocity: NormalRange = 1) => {
    time = time ?? context.now();
    triggerAttack(time, velocity);
    triggerRelease(time + duration);
  };

  /**
   * Get the scheduled value at the given time. This will
   * return the unconverted (raw) value.
   */
  const getValueAtTime = (time: ContextTime): NormalRange => {
    return sig.output.getValueAtTime(time);
  };

  /**
   * Cancels all scheduled envelope changes after the given time.
   */
  const cancel = (after?: ContextTime) => {
    sig.output.cancelScheduledValues(after ?? context.now());
  };

  /**
   * Connect the envelope to a destination node.
   */
  // TODO
  // connectSignal(this, destination, outputNumber, inputNumber);
  const connect = sig.connect.bind(sig);

  /**
   * Render the envelope curve to an array of the given length.
   * Good for visualizing the envelope curve
   */
  const asArray = async (length = 1024): Promise<Float32Array> => {
    const duration = length / context.sampleRate;
    const offline = createOfflineContext({
      length: duration,
      numberOfChannels: 1,
      sampleRate: context.sampleRate,
    });

    // normalize the ADSR for the given duration with 20% sustain time
    const attackPortion = attack + decay;
    const envelopeDuration = attackPortion + release;
    const sustainTime = envelopeDuration * 0.1;
    const totalDuration = envelopeDuration + sustainTime;
    const clone = createEnvelope({
      attack: duration * attack / totalDuration,
      decay: duration * decay / totalDuration,
      release: duration * release / totalDuration,
      context: offline,
    });

    clone.connect(context.destination);
    clone.triggerAttackRelease(duration * (attackPortion + sustainTime) / totalDuration, 0);

    const buffer = await offline.render();
    return buffer.getChannelData(0);
  };

  const dispose = () => {
    sig.disconnect();
  };

  const gain = createGain({ gain: 0 });
  sig.connect(gain.gain);

  return Object.assign(
    defineProperties(gain, {
      /**
       * Read the current value of the envelope. Useful for
       * synchronizing visual output to the envelope.
       */
      value: {
        get: () => {
          return getValueAtTime(context.now());
        },
      },
    }),
    {
      asArray,
      dispose,
      triggerAttackRelease,
      connect,
      cancel,
      getValueAtTime,
      triggerAttack,
      triggerRelease,
      // TODO maybe properties??
      sustain,
      release,
      attack,
      decay,
    },
  );
};


type BasicEnvelopeCurve = 'linear' | 'exponential';
type InternalEnvelopeCurve = BasicEnvelopeCurve | number[];