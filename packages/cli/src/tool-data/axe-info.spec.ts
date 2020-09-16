// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeInfo } from './axe-info';

const VERSION = 'axe.core.version';

describe(AxeInfo, () => {
    const axe = { version: VERSION };
    // tslint:disable-next-line: mocha-no-side-effect-code no-any
    const axeInfo = new AxeInfo(axe as any);

    it('has a default', () => {
        expect(axeInfo).not.toBe(undefined);
    });

    it('returns correct version', () => {
        expect(axeInfo.version).toBe(VERSION);
    });
});
