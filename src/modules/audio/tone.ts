import { isDefined } from './checks';
import { isArray } from 'util';
import { Context } from '@/modules/audio/Context';

export class Tone {
  public static context = new Context();

  static get supported() {
    const hasAudioContext = window.hasOwnProperty('AudioContext') || window.hasOwnProperty('webkitAudioContext');
    const hasPromises = window.hasOwnProperty('Promise');
    return hasAudioContext && hasPromises;
  }

  /**
   *  disconnect and dispose
   *  @returns this
   */
  public dispose() {
    return this;
  }

  /**
   *  Return the current time of the AudioContext clock plus
   *  the lookAhead.
   *  @return {Number} the currentTime from the AudioContext
   *  @static
   *  @memberOf Tone
   */
  // tslint:disable-next-line:member-ordering
  public now() {
    return Tone.context.now();
  }

  /**
   *  Return the current time of the AudioContext clock without
   *  any lookAhead.
   *  @return {Number} the currentTime from the AudioContext
   *  @memberOf Tone
   */
  // tslint:disable-next-line:member-ordering
  public immediate() {
    return Tone.context.currentTime;
  }
}
