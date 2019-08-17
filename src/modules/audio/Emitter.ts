import { emitter, Events } from '@/base/events';


export class Emitter<E extends Events> {
  private emitter = emitter<E>();
  // tslint:disable-next-line:member-ordering
  public on = this.emitter.on;
  // tslint:disable-next-line:member-ordering
  public off = this.emitter.off;
  // tslint:disable-next-line:member-ordering
  public once = this.emitter.once;
  // tslint:disable-next-line:member-ordering
  public emit = this.emitter.emit;

  public dispose() {
    this.emitter.removeAllListeners();
  }
}
