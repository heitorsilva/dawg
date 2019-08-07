import { Context } from '@/modules/audio/Context';
import { mergeObjects, wrap } from '@/modules/audio/utils';
import { Wrapper } from 'vue-function-api';

export interface AudioContextOptions {
  context?: Wrapper<Context>;
  input: AudioNode;
  output: AudioNode;
}

export class GraphNode {
  /**
   * Get the audio context belonging to this instance.
   */
  public readonly context: Wrapper<Context>;

  public output: AudioNode;
  public input: AudioNode;

  /**
   *  channelCount is the number of channels used when up-mixing and down-mixing
   *  connections to any inputs to the node. The default value is 2 except for
   *  specific nodes where its value is specially determined.
   *
   *  @memberof Tone.GraphNode#
   *  @type {Number}
   *  @name channelCount
   *  @readOnly
   */
  public readonly channelCount: Wrapper<number>;

  /**
   *  channelCountMode determines how channels will be counted when up-mixing and
   *  down-mixing connections to any inputs to the node.
   *  The default value is "max". This attribute has no effect for nodes with no inputs.
   *  @memberof Tone.GraphNode#
   *  @type {String}
   *  @name channelCountMode
   *  @readOnly
   */
  public readonly channelCountMode: Wrapper<ChannelCountMode>;

  /**
   *  channelInterpretation determines how individual channels will be treated
   *  when up-mixing and down-mixing connections to any inputs to the node.
   *  The default value is "speakers".
   *  @memberof Tone.GraphNode#
   *  @type {String}
   *  @name channelInterpretation
   *  @readOnly
   */
  public channelInterpretation: Wrapper<ChannelInterpretation>;

  constructor(opts: AudioContextOptions) {
    // use the default context if one is not passed in
    const options = mergeObjects(opts, { context });

    /**
     * The AudioContext of this instance
     * @private
     * @type {AudioContext}
     */
    this.context = options.context;
    this.output = options.output;
    this.input = options.input;

    this.channelCount =  wrap(options.output, 'channelCount');
    this.channelCountMode = wrap(options.output, 'channelCountMode');
    this.channelInterpretation = wrap(options.output, 'channelInterpretation');
  }

  public connect(node: GraphNode) {
    this.output.connect(node.output);
    return this;
  }

  public disconnect(node: GraphNode) {
    this.output.disconnect(node.output);
    return this;
  }

  public dispose() {
    this.input.disconnect();
    this.output.disconnect();
  }
}
