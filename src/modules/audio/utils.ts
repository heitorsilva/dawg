import Tone from 'tone';
import { computed, Wrapper } from 'vue-function-api';
import { Time } from '@/modules/audio/types';

/**
 * Whether the Web Audio API is supported and Promises.
 */
export const supported = computed(() => {
  const hasAudioContext = window.hasOwnProperty('AudioContext') || window.hasOwnProperty('webkitAudioContext');
  const hasPromises = window.hasOwnProperty('Promise');
  return hasAudioContext && hasPromises;
});

/**
 *  Test if the arg is undefined
 *  @param {*} arg the argument to test
 *  @returns {Boolean} true if the arg is undefined
 *  @static
 *  @memberOf Tone
 */
export const isUndef = <V>(val: undefined | V): val is undefined => {
  return typeof val === 'undefined';
};

/**
 *  Test if the arg is not undefined
 *  @param {*} arg the argument to test
 *  @returns {Boolean} true if the arg is undefined
 *  @static
 *  @memberOf Tone
 */
export const isDefined = <V>(val: undefined | V): val is V => {
  return !isUndef(val);
};

/**
 *  An empty function.
 *  @static
 */
// tslint:disable-next-line:no-empty
export const noOp = () => {};

export const mergeObjects = <T extends {}, V extends {}>(a?: T, b?: V): T & V => {
  const result: any = {};
  const insert = (o?: object) => {
    if (!o) {
      return;
    }

    type Key = keyof typeof o;
    for (const key of Object.keys(o) as Key[]) {
      if (result.hasOwnProperty(key)) {
        continue;
      }

      if (o[key] !== undefined) {
        result[key] = o[key];
      }
    }
  };
  insert(a);
  insert(b);
  return result;
};

export const wrap = <T, K extends keyof T>(o: T, k: K) => {
  return computed(() => {
    return o[k];
  }, (v) => {
    o[k] = v;
  });
};

export const wrapWrapper = <T, K extends keyof T>(o: Wrapper<T>, k: K) => {
  return computed(() => {
    return o.value[k];
  }, (v) => {
    o.value[k] = v;
  });
};

