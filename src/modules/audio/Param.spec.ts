import { expect } from '@/modules/audio/test';
import { Param } from '@/modules/audio/Param';
import { Context } from '@/modules/audio';

describe('Param', () => {
  it('can connect', () => {
    const param = Context.createGain();
    const input = Context.createGain();
    input.connect(param);
  });

  it('can be created with options', () => {
    const gain = Context.context.createGain();
    const param = new Param(gain.gain, {
      value: 5,
    });

    expect(param.value).to.equal(5);
  });

  it(`can have it's value set'`, () => {
    const gain = Context.createGain();
    gain.gain.value = 5;
    expect(gain.gain.value).to.eq(5);
  });

  it(`can set a value in the future'`, () => {
    const gain = Context.createGain();
    gain.gain.setValueAtTime({ value: 10, time: 11 });
    expect(gain.gain.getValueAtTime(11)).to.eq(10);
  });

  it(`can can cancel scheduled values'`, () => {
    const gain = Context.createGain();
    gain.gain.setValueAtTime({ value: 5, time: 5 });

    gain.gain.setValueAtTime({ value: 10, time: 11 });
    gain.gain.cancelScheduledValues(11);
    expect(gain.gain.getValueAtTime(11)).to.eq(5);

    gain.gain.setValueAtTime({ value: 10, time: 12 });
    gain.gain.cancelScheduledValues(9);
    expect(gain.gain.getValueAtTime(11)).to.eq(5);
  });
});
