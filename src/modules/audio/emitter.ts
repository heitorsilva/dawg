import Tone from 'tone';
import { emitter, Events } from '@/events';


export class Emitter<E extends Events> extends Tone.Tone {
  // tslint:disable-next-line:variable-name
  private emitter = emitter<E>();
  // tslint:disable-next-line:member-ordering
  public on = this.emitter.on;
  // tslint:disable-next-line:member-ordering
  public off = this.emitter.off;
  // tslint:disable-next-line:member-ordering
  public once = this.emitter.once;
  // tslint:disable-next-line:member-ordering
  public emit = this.emitter.emit;

  /**
   *  Clean up
   *  @return this
   */
  public dispose() {
    // this.emitter = null;
    return this;
  }
}
