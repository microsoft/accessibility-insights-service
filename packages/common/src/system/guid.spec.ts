// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Guid } from './guid';

describe('createGuid()', () => {
    it('create new UUID', () => {
        const guid = Guid.createGuid();
        expect(guid.length).toEqual(36);
        expect(guid.substr(13, 2)).toEqual('-6');
    });
});

describe('getGuidTimestamp()', () => {
    it('get creation timestamp of UUID', () => {
        const timestamp = Guid.getGuidTimestamp('1e9ce66b-fb58-6080-1a9d-ed3459ab8b4f').valueOf();
        expect(timestamp).toEqual(1567527630984);
    });
});
