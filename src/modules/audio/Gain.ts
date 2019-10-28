import { GraphNode } from '@/modules/audio/GraphNode';
import { Param, ParamOptions } from '@/modules/audio/Param';
import { Context } from '@/modules/audio/Context';

export class Gain extends GraphNode {
  public gain: Param;

  constructor(opts?: ParamOptions) {
    const gain = Context.context.createGain();
    super({
      node: gain,
    });

    // TODO toUnits and fromUnits?????
    this.gain = new Param(gain.gain, opts);
  }
}
