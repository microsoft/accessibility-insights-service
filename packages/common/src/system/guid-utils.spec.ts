// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { GuidUtils } from './guid-utils';

describe(GuidUtils, () => {
    let testSubject: GuidUtils;

    beforeEach(() => {
        testSubject = new GuidUtils();
    });

    describe('createGuid()', () => {
        it('create new UUID', () => {
            const guid = testSubject.createGuid();
            expect(guid.length).toEqual(36);
            expect(guid.substr(13, 2)).toEqual('-6');
        });

        it('create new UUID with fixed node part', () => {
            const guid = testSubject.createGuid();
            const nextGuid = testSubject.createGuidForNode(guid);
            expect(guid).not.toEqual(nextGuid);
            expect(guid.length).toEqual(36);
            expect(guid.substr(24, 6)).toEqual(nextGuid.substr(24, 6));
        });
    });

    describe('createGuid()', () => {
        it('get UUID node part', () => {
            const guidNode = testSubject.getGuidNode('1e9d0176-8301-6e80-bfb4-e55503791248');
            expect(guidNode).toEqual('e55503791248');
        });
    });

    describe('getGuidTimestamp()', () => {
        it('get creation timestamp of UUID', () => {
            const timestamp = testSubject.getGuidTimestamp('1e9ce66b-fb58-6080-1a9d-ed3459ab8b4f').valueOf();
            expect(timestamp).toEqual(1567527630984);
        });
    });
});
