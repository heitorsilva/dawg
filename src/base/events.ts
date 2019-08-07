import { EventEmitter } from 'events';

export interface Events {
  [name: string]: any[];
}

type GenericListener = (...args: any[]) => void;

export class StrictEventEmitter<E extends Events> extends EventEmitter {
  public addListener<T extends keyof E & string>(event: T, listener: (...args: E[T]) => void) {
    super.addListener(event, listener as GenericListener);
    return this;
  }

  public on<T extends keyof E & string>(event: T, listener: (...args: E[T]) => void) {
    super.on(event, listener as GenericListener);
    return this;
  }

  public once<T extends keyof E & string>(event: T, listener: (...args: E[T]) => void) {
    super.once(event, listener as GenericListener);
    return this;
  }

  public prependListener<T extends keyof E & string>(event: T, listener: (...args: E[T]) => void) {
    super.prependListener(event, listener as GenericListener);
    return this;
  }

  public prependOnceListener<T extends keyof E & string>(event: T, listener: (...args: E[T]) => void) {
    super.prependOnceListener(event, listener as GenericListener);
    return this;
  }

  public removeListener<T extends keyof E & string>(event: T, listener: (...args: E[T]) => void) {
    super.removeListener(event, listener as GenericListener);
    return this;
  }

  public off<T extends keyof E & string>(event: T, listener: (...args: E[T]) => void) {
    super.off(event, listener as GenericListener);
    return this;
  }

  public removeAllListeners<T extends keyof E & string>(event?: T) {
    return super.removeAllListeners(event);
  }

  public setMaxListeners(n: number): this {
    return super.setMaxListeners(n);
  }

  public getMaxListeners(): number {
    return super.getMaxListeners();
  }

  public listeners<T extends keyof E & string>(event: T) {
    return super.listeners(event) as Array<(...args: E[T]) => void>;
  }

  public rawListeners<T extends keyof E & string>(event: T) {
    return super.rawListeners(event) as Array<(...args: E[T]) => void>;
  }

  public emit<T extends keyof E & string>(event: T, ...args: any[]) {
    return super.emit(event, ...args);
  }

  public eventNames() {
    return super.eventNames() as Array<keyof E & string>;
  }

}

export function emitter<E extends Events>() {
  return new StrictEventEmitter<E>();
}

export {
  EventEmitter,
};
