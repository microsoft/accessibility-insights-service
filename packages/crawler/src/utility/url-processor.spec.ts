// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { URLProcessor } from './url-processor';

describe(URLProcessor, () => {
    let testSubject: URLProcessor;
    beforeEach(() => {
        testSubject = new URLProcessor();
    });

    it('getRootUrl', async () => {
        const url1 = 'www.bla.com/a/b/';
        const url2 = 'www.bla.com/a/b/c';

        expect(testSubject.getRootUrl(url1)).toStrictEqual(testSubject.getRootUrl(url2));
    });

    it('hasQueryParameters', async () => {
        const url1 = 'www.bla.com?p=v';
        const url2 = 'www.bla.com';

        expect(testSubject.hasQueryParameters(url1)).toStrictEqual(true);
        expect(testSubject.hasQueryParameters(url2)).toStrictEqual(false);
    });
});
