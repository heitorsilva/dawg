import { wrap } from '@/modules/audio/utils';
import { Wrapper } from 'vue-function-api';

export interface AudioContextOptions {
  node: AudioNode;
}

export class GraphNode {
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

  private node: AudioNode;

  constructor(opts: AudioContextOptions) {
    // use the default context if one is not passed in
    this.node = opts.node;

    this.channelCount =  wrap(opts.node, 'channelCount');
    this.channelCountMode = wrap(opts.node, 'channelCountMode');
    this.channelInterpretation = wrap(opts.node, 'channelInterpretation');
  }

  public connect(node: GraphNode) {
    this.node.connect(node.node);
    return this;
  }

  public disconnect(node: GraphNode) {
    this.node.disconnect(node.node);
    return this;
  }

  public dispose() {
    this.node.disconnect();
  }
}
