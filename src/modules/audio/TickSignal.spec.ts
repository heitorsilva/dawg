import { expect } from '@/modules/audio/test';
import { TickSignal } from '@/modules/audio/TickSignal';
import { Offline } from '@/modules/audio/Offline';

describe.only('TickSignal', () => {
  it('can be created with options', () => {
    const signal = new TickSignal({ frequency: 1 });
    expect(signal.value).to.eq(1);
    signal.dispose();
  });

  it('can schedule a change in the future', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 2, time: 0.2 });
    tickSignal.dispose();
  });

  it('can schedule a ramp in the future', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 2, time: 0 });
    tickSignal.linearRampToValueAtTime({ value: 0.1, endTime: 0.2 });
    tickSignal.exponentialRampToValueAtTime({ value: 1, endTime: 0.4 });
    tickSignal.dispose();
  });

  it('calculates the ticks when no changes are scheduled', () => {
    const tickSignal0 = new TickSignal({ frequency: 2 });
    expect(tickSignal0.getTicksAtTime(1)).to.eq(2);
    expect(tickSignal0.getTicksAtTime(2)).to.eq(4);
    expect(tickSignal0.getTimeOfTick(4)).to.eq(2);
    tickSignal0.dispose();

    const tickSignal1 = new TickSignal({ frequency: 1 });
    expect(tickSignal1.getTicksAtTime(1)).to.eq(1);
    expect(tickSignal1.getTicksAtTime(2)).to.eq(2);
    expect(tickSignal1.getTimeOfTick(2)).to.eq(2);
    tickSignal1.dispose();
  });

  it('calculates the ticks in the future when a setValueAtTime is scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 0 });
    tickSignal.setValueAtTime({ value: 2, time: 0.5 });
    expect(tickSignal.getTicksAtTime(0)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.5)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.75)).to.eq(0.5);
    expect(tickSignal.getTicksAtTime(1)).to.eq(1);
    expect(tickSignal.getTimeOfTick(1.5)).to.eq(1.25);
    tickSignal.dispose();
  });

  it('calculates the ticks in the future when multiple setValueAtTime are scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 0 });
    tickSignal.setValueAtTime({ value: 2, time: 1 });
    tickSignal.setValueAtTime({ value: 4, time: 2 });
    expect(tickSignal.getTicksAtTime(0)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.5)).to.eq(0);
    expect(tickSignal.getTicksAtTime(1)).to.eq(0);
    expect(tickSignal.getTicksAtTime(1.5)).to.eq(1);
    expect(tickSignal.getTicksAtTime(2)).to.eq(2);
    expect(tickSignal.getTicksAtTime(2.5)).to.eq(4);
    expect(tickSignal.getTicksAtTime(3)).to.eq(6);
    expect(tickSignal.getTimeOfTick(6)).to.eq(3);
    tickSignal.dispose();
  });

  it('if ticks are 0, getTicksAtTime will return 0', () => {
    const tickSignal = new TickSignal({ frequency: 0 });
    tickSignal.setValueAtTime({ value: 0, time: 1 });
    tickSignal.linearRampToValueAtTime({ value: 0, endTime: 2 });
    expect(tickSignal.getTicksAtTime(0)).to.equal(0);
    expect(tickSignal.getTicksAtTime(1)).to.equal(0);
    expect(tickSignal.getTicksAtTime(2)).to.equal(0);
    expect(tickSignal.getTicksAtTime(3)).to.equal(0);
    tickSignal.dispose();
  });

  it('calculates the ticks in the future when a linearRampToValueAtTime is scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.linearRampToValueAtTime({ value: 2, endTime: 1 });
    expect(tickSignal.getValueAtTime(0)).to.eq(1);
    expect(tickSignal.getValueAtTime(0.5)).to.eq(1.5);
    expect(tickSignal.getValueAtTime(1)).to.eq(2);
    expect(tickSignal.getTicksAtTime(0)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.5)).to.eq(0.625);
    expect(tickSignal.getTicksAtTime(1)).to.eq(1.5);
    expect(tickSignal.getTicksAtTime(2)).to.eq(3.5);
    tickSignal.dispose();
  });

  it('calculates the ticks in the future when multiple linearRampToValueAtTime are scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.linearRampToValueAtTime({ value: 2, endTime: 1 });
    tickSignal.linearRampToValueAtTime({ value: 0, endTime: 2 });
    expect(tickSignal.getTicksAtTime(0)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.5)).to.eq(0.625);
    expect(tickSignal.getTicksAtTime(1)).to.eq(1.5);
    expect(tickSignal.getTicksAtTime(2)).to.eq(2.5);
    expect(tickSignal.getTicksAtTime(3)).to.eq(2.5);
    tickSignal.dispose();
  });

  it('calculates the ticks in the future when a exponentialRampToValueAtTime is scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 1, time: 0 });
    tickSignal.exponentialRampToValueAtTime({ value: 2, endTime: 1 });
    expect(tickSignal.getTicksAtTime(0)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.5)).to.closeTo(0.60, 0.01);
    expect(tickSignal.getTicksAtTime(1)).to.closeTo(1.44, 0.01);
    expect(tickSignal.getTicksAtTime(2)).to.closeTo(3.44, 0.01);
    expect(tickSignal.getTicksAtTime(3)).to.closeTo(5.44, 0.01);
    tickSignal.dispose();
  });

  it('calculates the ticks in the future when multiple exponentialRampToValueAtTime are scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 1, time: 0 });
    tickSignal.exponentialRampToValueAtTime({ value: 2, endTime: 1 });
    tickSignal.exponentialRampToValueAtTime({ value: 0, endTime: 2 });
    expect(tickSignal.getTicksAtTime(0)).to.eq(0);
    expect(tickSignal.getTicksAtTime(0.5)).to.closeTo(0.6, 0.01);
    expect(tickSignal.getTicksAtTime(1)).to.closeTo(1.44, 0.01);
    expect(tickSignal.getTicksAtTime(2)).to.closeTo(1.54, 0.01);
    expect(tickSignal.getTicksAtTime(3)).to.closeTo(1.54, 0.01);
    tickSignal.dispose();
  });

  it('computes the time of a given tick when nothing is scheduled', () => {
    const tickSignal0 = new TickSignal({ frequency: 1 });
    expect(tickSignal0.getTimeOfTick(0)).to.eq(0);
    expect(tickSignal0.getTimeOfTick(1)).to.eq(1);
    expect(tickSignal0.getTimeOfTick(2)).to.eq(2);
    expect(tickSignal0.getTimeOfTick(3)).to.eq(3);
    tickSignal0.dispose();

    const tickSigna1 = new TickSignal({ frequency: 2 });
    expect(tickSigna1.getTimeOfTick(0)).to.eq(0);
    expect(tickSigna1.getTimeOfTick(1)).to.eq(0.5);
    expect(tickSigna1.getTimeOfTick(2)).to.eq(1);
    expect(tickSigna1.getTimeOfTick(3)).to.eq(1.5);
    tickSigna1.dispose();
  });

  it('computes the time of a given tick when setValueAtTime is scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 0.5, time: 1 });
    expect(tickSignal.getTimeOfTick(0)).to.eq(0);
    expect(tickSignal.getTimeOfTick(1)).to.eq(1);
    expect(tickSignal.getTimeOfTick(2)).to.eq(3);
    expect(tickSignal.getTimeOfTick(3)).to.eq(5);
    tickSignal.dispose();
  });

  it('returns Infinity if the tick interval is 0', () => {
    const tickSignal = new TickSignal({ frequency: 0 });
    expect(tickSignal.getTimeOfTick(1)).to.equal(Infinity);
    tickSignal.dispose();
  });

  it('computes the time of a given tick when multiple setValueAtTime are scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 0.5, time: 1 });
    tickSignal.setValueAtTime({ value: 0, time: 2 });
    expect(tickSignal.getTimeOfTick(0)).to.eq(0);
    expect(tickSignal.getTimeOfTick(1)).to.eq(1);
    expect(tickSignal.getTimeOfTick(1.499)).to.closeTo(1.998, 0.000001);
    expect(tickSignal.getTimeOfTick(2)).to.equal(Infinity);
    tickSignal.dispose();
  });

  it('computes the time of a given tick when a linearRampToValueAtTime is scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.linearRampToValueAtTime({ value: 2, endTime: 1 });
    expect(tickSignal.getTimeOfTick(0)).to.eq(0);
    // y = 1 + x
    // <TICKS> = x + x^2/2
    expect(tickSignal.getTimeOfTick(1)).to.closeTo(0.7320508, 0.00001);
    expect(tickSignal.getTimeOfTick(2)).to.eq(1.25);
    expect(tickSignal.getTimeOfTick(3)).to.eq(1.75);
    tickSignal.dispose();
  });

  it('computes the time of a given tick when multiple linearRampToValueAtTime are scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.linearRampToValueAtTime({ value: 2, endTime: 1 });
    tickSignal.linearRampToValueAtTime({ value: 0, endTime: 2 });
    expect(tickSignal.getTimeOfTick(0)).to.eq(0);
    expect(tickSignal.getTimeOfTick(1)).to.closeTo(0.7320508, 0.000001);
    expect(tickSignal.getTimeOfTick(2)).to.closeTo(1.29289321, 0.000001);
    expect(tickSignal.getTimeOfTick(3)).to.equal(Infinity);
    tickSignal.dispose();
  });

  it('computes the time of a given tick when a exponentialRampToValueAtTime is scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.exponentialRampToValueAtTime({ value: 2, endTime: 1 });
    expect(tickSignal.getTimeOfTick(0)).to.eq(0);
    expect(tickSignal.getTimeOfTick(2)).to.closeTo(1.27836, 0.00001);
    expect(tickSignal.getTimeOfTick(3)).to.closeTo(1.778363691, 0.00001);
    tickSignal.dispose();
  });

  it('computes the time of a given tick when multiple exponentialRampToValueAtTime are scheduled', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 1, time: 0 });
    tickSignal.exponentialRampToValueAtTime({ value: 2, endTime: 1 });
    tickSignal.exponentialRampToValueAtTime({ value: 0, endTime: 2 });
    expect(tickSignal.getTimeOfTick(0)).to.eq(0);
    expect(tickSignal.getTimeOfTick(0.5)).to.closeTo(0.42914774, 0.00001);
    expect(tickSignal.getTimeOfTick(1.5)).to.closeTo(1.03421807444, 0.000001);
    expect(tickSignal.getTimeOfTick(3)).to.equal(Infinity);
    tickSignal.dispose();
  });

  it('can schedule multiple types of curves', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 1, time: 0 });
    tickSignal.exponentialRampToValueAtTime({ value: 4, endTime: 1 });
    tickSignal.linearRampToValueAtTime({ value: 0.2, endTime: 2 });
    tickSignal.setValueAtTime({ value: 2, time: 3 });
    tickSignal.linearRampToValueAtTime({ value: 2, endTime: 4 });

    for (let time = 0; time < 4; time += 0.2) {
      const tick = tickSignal.getTicksAtTime(time);
      expect(tickSignal.getTimeOfTick(tick)).to.closeTo(time, 0.000001);
    }

    tickSignal.dispose();
  });

  it('can get the duration of a tick at any point in time', () => {
    const tickSignal = new TickSignal({ frequency: 1 });
    tickSignal.setValueAtTime({ value: 2, time: 1 });
    tickSignal.setValueAtTime({ value: 10, time: 2 });
    expect(tickSignal.getDurationOfTicks(1, 0)).to.eq(1);
    expect(tickSignal.getDurationOfTicks(1, 1)).to.eq(0.5);
    expect(tickSignal.getDurationOfTicks(1, 2)).to.closeTo(0.1, 0.00001);
    expect(tickSignal.getDurationOfTicks(2, 1.5)).to.closeTo(0.6, 0.000001);
  });

  it('outputs a signal', () => {
    return Offline(() => {
      const sched = new TickSignal({ frequency: 1 });
      sched.node.toMaster();
      sched.setValueAtTime({ time: 0, value: 0 });
      sched.linearRampToValueAtTime({ endTime: 1, value: 3 });
    }, 1.01).then((buffer) => {
      // TODO
      expect((buffer as any).getValueAtTime(0)).to.eq(1);
      expect((buffer as any).getValueAtTime(0.5)).to.eq(2);
      expect((buffer as any).getValueAtTime(1)).to.eq(3);
    });
  });
});
