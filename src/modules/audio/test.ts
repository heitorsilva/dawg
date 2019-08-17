import { expect as ex } from 'chai';

type Expect = <T>(value: T) => Assertion<T>;

type Equal<T> = (value: T, message?: string) => Assertion<T>;

interface Assertion<T> {
  to: Assertion<T>;
  not: Assertion<T>;
  eq: Equal<T>;
  equal: Equal<T>;
}

export const expect: Expect = ex;
