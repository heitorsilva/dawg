import { GraphNode } from '@/modules/audio/GraphNode';
import { Param, ParamOptions } from '@/modules/audio/Param';

export class Gain extends GraphNode {
  public gain: Param;

  constructor(gain: GainNode, opts?: ParamOptions) {
    super({
      input: gain,
      output: gain,
    });
    this.gain = new Param(gain.gain, gain, opts);
  }
}
