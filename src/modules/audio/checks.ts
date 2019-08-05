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
 *  Test if the arg is a function
 *  @param {*} arg the argument to test
 *  @returns {Boolean} true if the arg is a function
 *  @static
 *  @memberOf Tone
 */
export const isFunction = (val) => {
  return typeof val === 'function';
};

/**
 *  Test if the argument is a number.
 *  @param {*} arg the argument to test
 *  @returns {Boolean} true if the arg is a number
 *  @static
 *  @memberOf Tone
 */
export const isNumber = (arg) => {
  return (typeof arg === 'number');
};

/**
 *  Test if the given argument is an object literal (i.e. `{}`);
 *  @param {*} arg the argument to test
 *  @returns {Boolean} true if the arg is an object literal.
 *  @static
 *  @memberOf Tone
 */
export const isObject = (arg) => {
  return (Object.prototype.toString.call(arg) === '[object Object]' && arg.constructor === Object);
};

/**
 *  Test if the argument is a boolean.
 *  @param {*} arg the argument to test
 *  @returns {Boolean} true if the arg is a boolean
 *  @static
 *  @memberOf Tone
 */
export const isBoolean = (arg) => {
  return (typeof arg === 'boolean');
};

/**
 *  Test if the argument is an Array
 *  @param {*} arg the argument to test
 *  @returns {Boolean} true if the arg is an array
 *  @static
 *  @memberOf Tone
 */
export const isArray = (arg) => {
  return (Array.isArray(arg));
};

/**
 *  Test if the argument is a string.
 *  @param {*} arg the argument to test
 *  @returns {Boolean} true if the arg is a string
 *  @static
 *  @memberOf Tone
 */
export const isString = (arg) => {
  return (typeof arg === 'string');
};

/**
 *  Test if the argument is in the form of a note in scientific pitch notation.
 *  e.g. "C4"
 *  @param {*} arg the argument to test
 *  @returns {Boolean} true if the arg is a string
 *  @static
 *  @memberOf Tone
 */
export const isNote = (arg) => {
  return isString(arg) && /^([a-g]{1}(?:b|#|x|bb)?)(-?[0-9]+)/i.test(arg);
};

/**
 *  An empty function.
 *  @static
 */
// tslint:disable-next-line:no-empty
export const noOp = () => {};

export const mergeObjects = <T extends {}>(b: Required<T>, a?: T) => {
  const result: any = {};
  for (const key of Object.keys(b) as Array<keyof T>) {
    if (!a || a[key] === undefined) {
      result[key] = b[key];
    } else {
      result[key] = a[key];
    }
  }

  return result as Required<T>;
};
