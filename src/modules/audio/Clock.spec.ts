import { Clock } from '@/modules/audio/Clock';
import { expect, whenBetween } from '@/modules/audio/test';
import { Offline } from '@/modules/audio/Offline';
import { Context } from '@/modules/audio';

describe('Clock', () => {
  context('Get/Set values', () => {

    it('can get and set the frequency', () => {
      const clock = new Clock({ callback: () => ({}), frequency: 2 });
      expect(clock.frequency.value).to.equal(2);
      clock.frequency.value = 0.2;
      expect(clock.frequency.value).to.eq(0.2);
      clock.dispose();
    });

    // if (Supports.ONLINE_TESTING) {

    it('invokes the callback when started', (done) => {
      const clock = new Clock({ callback: () => {
        clock.dispose();
        done();
      }, frequency: 10 }).start();
    });

    it('can be constructed with an options object', (done) => {
      const clock = new Clock({
        callback() {
          clock.dispose();
          done();
        },
        frequency : 8,
      }).start();
      expect(clock.frequency.value).to.equal(8);
    });

    // }
  });

  context('State', () => {

    it('correctly returns the scheduled play state', () => {
      return Offline(() => {
        const clock = new Clock();
        expect(clock.state).to.equal('stopped');
        clock.start(0).stop(0.2);
        expect(clock.state).to.equal('started');

        return (time) => {
          whenBetween(time, 0, 0.2, () => {
            expect(clock.state).to.equal('started');
          });

          whenBetween(time, 0.2, Infinity, () => {
            expect(clock.state).to.equal('stopped');
          });
        };
      }, 0.3);
    });

    it('can start, pause, and stop', () => {
      return Offline(() => {
        const clock = new Clock();
        expect(clock.state).to.equal('stopped');
        clock.start(0).pause(0.2).stop(0.4);
        expect(clock.state).to.equal('started');

        return (time) => {
          whenBetween(time, 0, 0.2, () => {
            expect(clock.state).to.equal('started');
          });

          whenBetween(time, 0.2, 0.4, () => {
            expect(clock.state).to.equal('paused');
          });

          whenBetween(time, 0.4, Infinity, () => {
            expect(clock.state).to.equal('stopped');
          });
        };

      }, 0.5);
    });

    it('can schedule multiple start and stops', () => {
      return Offline(() => {
        const clock = new Clock();
        expect(clock.state).to.equal('stopped');
        clock.start(0).pause(0.1).stop(0.2).start(0.3).stop(0.4);
        expect(clock.state).to.equal('started');

        return (time) => {
          whenBetween(time, 0.1, 0.2, () => {
            expect(clock.state).to.equal('paused');
            expect(clock.ticks.value).to.be.greaterThan(0);
          });
          whenBetween(time, 0.2, 0.3, () => {
            expect(clock.state).to.equal('stopped');
            expect(clock.ticks.value).to.equal(0);
          });
          whenBetween(time, 0.3, 0.4, () => {
            expect(clock.state).to.equal('started');
            expect(clock.ticks.value).to.be.greaterThan(0);
          });
        };
      }, 0.5);
    });

    it('stop and immediately start', () => {
      return Offline(() => {
        const clock = new Clock();
        expect(clock.state).to.equal('stopped');
        clock.start(0).stop(0.1).start(0.1);
        expect(clock.state).to.equal('started');

        return (time) => {
          whenBetween(time, 0, 0.1, () => {
            expect(clock.state).to.equal('started');
          });

          whenBetween(time, 0.1, 0.5, () => {
            expect(clock.state).to.equal('started');
          });
        };

      }, 0.5);
    });
  });

  context('Scheduling', () => {

    // if (Supports.ONLINE_TESTING) {

    it('passes a time to the callback', (done) => {
      const clock = new Clock({ callback: (time) => {
        expect(typeof time).to.eq('number');
        clock.dispose();
        done();
      }, frequency: 10 }).start();
    });

    it('invokes the callback with a time great than now', (done) => {
      const clock = new Clock({ callback: (time) => {
        clock.dispose();
        expect(time).to.be.greaterThan(now);
        done();
      }, frequency: 10 });
      const now = Context.now();
      const startTime = now + 0.1;
      clock.start(startTime);
    });

    it('invokes the first callback at the given start time', (done) => {
      const clock = new Clock({ callback: (time) => {
        clock.dispose();
        expect(time).to.eq(startTime);
        done();
      }, frequency: 10 });
      const startTime = Context.now() + 0.1;
      clock.start(startTime);
    });
    // }

    it('can be scheduled to start in the future', () => {
      let invokations = 0;
      return Offline(() => {
        const clock = new Clock({ callback: (time) => {
          invokations++;
        }, frequency: 2 }).start(0.1);
      }, 0.4).then(() => {
        expect(invokations).to.equal(1);
      });
    });

    it('invokes the right number of callbacks given the duration', () => {
      let invokations = 0;
      return Offline(() => {
        new Clock({ callback: (time) => {
          invokations++;
        }, frequency: 10 }).start(0).stop(0.45);
      }, 0.6).then(() => {
        expect(invokations).to.equal(5);
      });
    });

    it('can schedule the frequency of the clock', () => {
      let invokations = 0;
      return Offline(() => {
        const clock = new Clock({ callback: () => {
          invokations++;
        }, frequency: 2 });
        clock.start(0).stop(1.01);
        clock.frequency.setValueAtTime({ value: 4, time: 0.5 });
      }, 2).then(() => {
        expect(invokations).to.equal(4);
      });
    });

  });

  context('Seconds', () => {

    it('can set the current seconds', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 10 });
        expect(clock.seconds.value).to.eq(0);
        clock.seconds.value = 3;
        expect(clock.seconds.value).to.eq(3);
        clock.dispose();
      });
    });

    it('can get the seconds', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 10 });
        expect(clock.seconds.value).to.eq(0);
        clock.start(0.05);
        return (time) => {
          if (time > 0.05) {
            expect(clock.seconds.value).to.eq(time - 0.05);
          }
        };
      }, 0.1);
    });
  });

  context('Ticks', () => {

    it('has 0 ticks when first created', () => {
      const clock = new Clock();
      expect(clock.ticks.value).to.equal(0);
      clock.dispose();
    });

    // it('increments 1 tick per callback', () => {
    //   return Offline(() => {
    //     let ticks = 0;
    //     const clock = new Clock({
    //       callback: () => {
    //         ticks++;
    //       },
    //       frequency: 2,
    //     }).start();
    //     return Test.atTime(0.59, () => {
    //       expect(ticks).to.equal(clock.ticks.value);
    //     });
    //   }, 0.6).then(() => {
    //   });
    // });

    it('resets ticks on stop', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 }).start(0).stop(0.1);
        return (time) => {
          whenBetween(time, 0.01, 0.09, () => {
            expect(clock.ticks.value).to.be.greaterThan(0);
          });
          whenBetween(time, 0.1, Infinity, () => {
            expect(clock.ticks.value).to.equal(0);
          });
        };
      }, 0.2);
    });

    it('does not reset ticks on pause but stops incrementing', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 }).start(0).pause(0.1);
        let pausedTicks = 0;
        return (time) => {
          whenBetween(time, 0.01, 0.1, () => {
            expect(clock.ticks.value).to.be.greaterThan(0);
            pausedTicks = clock.ticks.value;
          });
          whenBetween(time, 0.1, Infinity, () => {
            expect(clock.ticks.value).to.equal(pausedTicks);
          });
        };
      }, 0.2);
    });

    it('starts incrementing where it left off after pause', () => {

      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 }).start(0).pause(0.1).start(0.2);

        let pausedTicks = 0;
        let tested = false;
        return (time) => {
          whenBetween(time, 0.01, 0.1, () => {
            expect(clock.ticks.value).to.be.greaterThan(0);
            pausedTicks = clock.ticks.value;
          });
          whenBetween(time, 0.1, 0.19, () => {
            expect(clock.ticks.value).to.equal(pausedTicks);
          });
          whenBetween(time, 0.21, Infinity, () => {
            if (!tested) {
              tested = true;
              expect(clock.ticks.value).to.equal(pausedTicks + 1);
            }
          });
        };
      }, 0.3);
    });

    it('can start with a tick offset', () => {
      return Offline(() => {
        let tested = false;
        const clock = new Clock({
          callback: (time, ticks) => {
            if (!tested) {
              tested = true;
              expect(ticks).to.equal(4);
            }
          },
          frequency: 10,
        });
        expect(clock.ticks.value).to.equal(0);
        clock.start(0, 4);
      });
    });

  });

  context('Events', () => {

    it('triggers the start event on start', (done) => {
      Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        const startTime = 0.3;
        clock.on('start', (time, offset) => {
          expect(time).to.eq(startTime);
          expect(offset).to.equal(0);
          done();
        });
        clock.start(startTime);
      }, 0.4);
    });

    it('triggers the start event with an offset', (done) => {
      Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        const startTime = 0.3;
        clock.on('start', (time, offset) => {
          expect(time).to.eq(startTime);
          expect(offset).to.equal(2);
          done();
        });
        clock.start(startTime, 2);
      }, 0.4);
    });

    it('triggers stop event', (done) => {
      Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        const stopTime = 0.3;
        clock.on('stop', (time) => {
          expect(time).to.eq(stopTime);
          done();
        });
        clock.start().stop(stopTime);
      }, 0.4);
    });

    it('triggers pause stop event', (done) => {
      Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        clock.on('pause', (time) => {
          expect(time).to.eq(0.1);
        });
        clock.on('stop', (time) => {
          expect(time).to.eq(0.2);
          done();
        });
        clock.start().pause(0.1).stop(0.2);
      }, 0.4);
    });

    it('triggers events even in close proximity', (done) => {
      Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        let invokedStartEvent = false;
        clock.on('start', () => {
          invokedStartEvent = true;
        });
        clock.on('stop', () => {
          expect(invokedStartEvent).to.eq(true);
          done();
        });
        clock.start(0.09999).stop(0.1);
      }, 0.4);
    });
  });

  context('[get/set]Ticks', () => {

    it('always reports 0 if not started', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        expect(clock.getTicksAtTime(0)).to.equal(0);
        expect(clock.getTicksAtTime(1)).to.equal(0);
        expect(clock.getTicksAtTime(2)).to.equal(0);
        clock.dispose();
      });
    });

    it('can get ticks in the future', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        clock.start(1);
        expect(clock.getTicksAtTime(1)).to.eq(0);
        expect(clock.getTicksAtTime(1.5)).to.eq(10);
        expect(clock.getTicksAtTime(2)).to.eq(20);
        clock.dispose();
      });
    });

    it('pauses on last ticks', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        clock.start(0).pause(1);
        expect(clock.getTicksAtTime(0.5)).to.eq(10);
        expect(clock.getTicksAtTime(1)).to.eq(20);
        expect(clock.getTicksAtTime(2)).to.eq(20);
        expect(clock.getTicksAtTime(3)).to.eq(20);
        clock.dispose();
      });
    });

    it('resumes from paused position', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        clock.start(0).pause(1).start(2);
        expect(clock.getTicksAtTime(0.5)).to.eq(10);
        expect(clock.getTicksAtTime(1)).to.eq(20);
        expect(clock.getTicksAtTime(2)).to.eq(20);
        expect(clock.getTicksAtTime(3)).to.eq(40);
        expect(clock.getTicksAtTime(3.5)).to.eq(50);
        clock.dispose();
      });
    });

    it('can get tick position after multiple pauses', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 10 });
        clock.start(0).pause(1).start(2).pause(3).start(4);
        expect(clock.getTicksAtTime(0.5)).to.eq(5);
        expect(clock.getTicksAtTime(1)).to.eq(10);
        expect(clock.getTicksAtTime(2)).to.eq(10);
        expect(clock.getTicksAtTime(3)).to.eq(20);
        expect(clock.getTicksAtTime(4)).to.eq(20);
        expect(clock.getTicksAtTime(5)).to.eq(30);
        clock.dispose();
      });
    });

    it('can get tick position after multiple pauses and tempo scheduling', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 10 });
        clock.frequency.setValueAtTime({ value: 100, time: 3.5 });
        clock.start(0).pause(1).start(2).pause(3).start(4);
        expect(clock.getTicksAtTime(0.5)).to.eq(5);
        expect(clock.getTicksAtTime(1)).to.eq(10);
        expect(clock.getTicksAtTime(2)).to.eq(10);
        expect(clock.getTicksAtTime(3)).to.eq(20);
        expect(clock.getTicksAtTime(4)).to.eq(20);
        expect(clock.getTicksAtTime(5)).to.eq(120);
        clock.dispose();
      });
    });

    it('can get tick position after multiple pauses and setting ticks', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 10 });
        clock.start(0).pause(1).start(2).pause(3).start(4);
        clock.setTicksAtTime({ ticks: 10, time: 2.5 });
        expect(clock.getTicksAtTime(0.5)).to.eq(5);
        expect(clock.getTicksAtTime(1)).to.eq(10);
        expect(clock.getTicksAtTime(2)).to.eq(10);
        expect(clock.getTicksAtTime(3)).to.eq(15);
        expect(clock.getTicksAtTime(4)).to.eq(15);
        expect(clock.getTicksAtTime(5)).to.eq(25);
        clock.dispose();
      });
    });

    it('resumes from paused position with tempo scheduling', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        clock.start(0).pause(1).start(2);
        clock.frequency.setValueAtTime({ value: 20, time: 0 });
        clock.frequency.setValueAtTime({ value: 10, time: 0.5 });
        expect(clock.getTicksAtTime(0.5)).to.eq(10);
        expect(clock.getTicksAtTime(1)).to.eq(15);
        expect(clock.getTicksAtTime(2)).to.eq(15);
        expect(clock.getTicksAtTime(3)).to.eq(25);
        expect(clock.getTicksAtTime(3.5)).to.eq(30);
        clock.dispose();
      });
    });

    it('can set a tick value at the given time', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        clock.start(0);
        clock.setTicksAtTime({ ticks: 0, time: 1 });
        clock.setTicksAtTime({ ticks: 0, time: 2 });
        expect(clock.getTicksAtTime(0)).to.eq(0);
        expect(clock.getTicksAtTime(0.5)).to.eq(10);
        expect(clock.getTicksAtTime(1)).to.eq(0);
        expect(clock.getTicksAtTime(1.5)).to.eq(10);
        expect(clock.getTicksAtTime(2)).to.eq(0);
        expect(clock.getTicksAtTime(2.5)).to.eq(10);
        expect(clock.getTicksAtTime(3)).to.eq(20);
        clock.dispose();
      });
    });

    it('can get a tick position while the frequency is scheduled with setValueAtTime', () => {
      return Offline(() => {
        const clock = new Clock({ callback: () => ({}), frequency: 20 });
        clock.start(0);
        clock.frequency.setValueAtTime({ value: 2, time: 1 });
        clock.setTicksAtTime({ ticks: 0, time: 1 });
        clock.setTicksAtTime({ ticks: 0, time: 2 });
        expect(clock.getTicksAtTime(0)).to.eq(0);
        expect(clock.getTicksAtTime(0.5)).to.eq(10);
        expect(clock.getTicksAtTime(1)).to.eq(0);
        expect(clock.getTicksAtTime(1.5)).to.eq(1);
        expect(clock.getTicksAtTime(2)).to.eq(0);
        expect(clock.getTicksAtTime(2.5)).to.eq(1);
        expect(clock.getTicksAtTime(3)).to.eq(2);
        clock.dispose();
      });
    });

  });

});
