import { expect as ex } from 'chai';
export const expect = ex;
export const whenBetween = (value, lowerBound, upperBound, f) => {
    if (value > lowerBound && value < upperBound) {
        f();
    }
};
//# sourceMappingURL=index.js.map