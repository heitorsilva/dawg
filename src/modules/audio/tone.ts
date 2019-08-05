import { isDefined } from './checks';
import { isArray } from 'util';

export class Tone {
  public static context = new AudioContext();

  static get supported() {
    const hasAudioContext = window.hasOwnProperty('AudioContext') || window.hasOwnProperty('webkitAudioContext');
    const hasPromises = window.hasOwnProperty('Promise');
    return hasAudioContext && hasPromises;
  }

  /**
   * 	Most browsers will not play _any_ audio until a user
   * 	clicks something (like a play button). Invoke this method
   * 	on a click or keypress event handler to start the audio context.
   * 	More about the Autoplay policy
   * [here](https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio)
   *  @memberOf Tone
   *  @static
   *  @return {Promise} This promise is resolved when the audio context is started.
   *  @example
   * document.querySelector('#playbutton').addEventListener('click', () => Tone.start())
   */
  public static start() {
    return Tone.context.resume();
  }

  /**
   *  disconnect and dispose
   *  @returns this
   */
  public dispose() {
    return this;
  }

  /**
   * Connect two nodes together so that signal flows from the
   * first node to the second. The second node can be an AudioParam.
   * Optionally specific the input and output channels.
   * @param {(AudioNode|Tone.AudioNode)} srcNode The source node
   * @param {(AudioNode|Tone.AudioNode|AudioParam|Tone.AudioParam)} dstNode The destination node
   * @param {number} [outputNumber=0] The output channel of the srcNode
   * @param {number} [inputNumber=0] The input channel of the dstNode
   */
  // tslint:disable-next-line:member-ordering
  public connect(srcNode, dstNode, outputNumber, inputNumber) {

    // resolve the input of the dstNode
    while (isDefined(dstNode.input)) {
      if (isArray(dstNode.input)) {
        inputNumber = inputNumber || 0;
        dstNode = dstNode.input[inputNumber];
        inputNumber = 0;
      } else if (dstNode.input) {
        dstNode = dstNode.input;
      }
    }

    // make the connection
    if (dstNode instanceof AudioParam) {
      srcNode.connect(dstNode, outputNumber);
    } else if (dstNode instanceof AudioNode) {
      srcNode.connect(dstNode, outputNumber, inputNumber);
    }

    return Tone;
  }

  /**
   * Disconnect a node from all nodes or optionally include a destination node and input/output channels.
   * @param {(AudioNode|Tone.AudioNode)} srcNode The source node
   * @param {?(AudioNode|Tone.AudioNode|AudioParam|Tone.AudioParam)} dstNode The destination node
   * @param {?number} [outputNumber=0] The output channel of the srcNode
   * @param {?number} [inputNumber=0] The input channel of the dstNode
   */
  // tslint:disable-next-line:member-ordering
  public static disconnect(srcNode, dstNode, outputNumber?: number, inputNumber?: number) {
    if (dstNode) {
      // resolve the input of the dstNode
      let bDone = false;
      while (!bDone) {
        if (isArray(dstNode.input)) {
          if (isDefined(inputNumber)) {
            Tone.disconnect(srcNode, dstNode.input[inputNumber], outputNumber);
          } else {
            dstNode.input.forEach((dstNode) => {
              // ignore errors from connections that aren't there
              try {
                Tone.disconnect(srcNode, dstNode, outputNumber);
              } catch (e) {
                //
              }
            });
          }
          bDone = true;
        } else if (dstNode.input) {
          dstNode = dstNode.input;
        } else {
          bDone = true;
        }
      }

      // make the connection
      if (dstNode instanceof AudioParam) {
        srcNode.disconnect(dstNode, outputNumber);
      } else if (dstNode instanceof AudioNode) {
        srcNode.disconnect(dstNode, outputNumber, inputNumber);
      }
    } else {
      srcNode.disconnect();
    }

    return Tone;
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
