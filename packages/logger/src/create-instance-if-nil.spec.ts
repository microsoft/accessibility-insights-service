import { createInstanceIfNil } from './create-instance-if-nil';

describe(createInstanceIfNil, () => {
    // tslint:disable-next-line: no-null-keyword
    test.each([null, undefined])('creates instance when nil - %o', testCase => {
        expect(
            createInstanceIfNil(testCase, () => {
                return 1;
            }),
        ).toBe(1);
    });

    it('does not create instance when not nil', async () => {
        expect(
            createInstanceIfNil(1, () => {
                return 10;
            }),
        ).toBe(1);
    });

    it('returns promise when factory returns promise', async () => {
        const promise = Promise.resolve(1);
        // tslint:disable-next-line: no-floating-promises
        await expect(
            // tslint:disable-next-line: no-null-keyword
            createInstanceIfNil(null, async () => {
                return promise;
            }),
        ).resolves.toBe(1);
    });

    it('returns promise when passed instance is promise object', async () => {
        const promise = Promise.resolve(1);
        // tslint:disable-next-line: no-floating-promises
        expect(
            // tslint:disable-next-line: no-null-keyword
            createInstanceIfNil(promise, async () => {
                return Promise.resolve(10);
            }),
        ).resolves.toBe(1);
    });
});
