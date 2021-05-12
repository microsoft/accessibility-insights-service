// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import normalizePath from 'normalize-path';
import { IMock, It, Mock, Times } from 'typemoq';
import { ensureDirectory, ensureDirectoryImpl } from './ensure-directory';

describe(ensureDirectory, () => {
    let fsMock: IMock<typeof fs>;
    let normalizePathMock: IMock<typeof normalizePath>;
    const directory = 'directory';
    const normalizedPath = 'normalized path';

    beforeEach(() => {
        fsMock = Mock.ofType<typeof fs>();
        normalizePathMock = Mock.ofInstance(() => null);
    });

    afterEach(() => {
        fsMock.verifyAll();
        normalizePathMock.verifyAll();
    });

    it.each(['', undefined])('uses current directory if directory=%s', (emptyDirString) => {
        normalizePathMock
            .setup((n) => n(__dirname))
            .returns(() => normalizedPath)
            .verifiable();
        fsMock.setup((f) => f.existsSync(normalizedPath)).returns(() => true);

        const result = ensureDirectoryImpl(emptyDirString, fsMock.object, normalizePathMock.object);
        expect(result).toEqual(normalizedPath);
    });

    it('creates directory if it does not exist', () => {
        normalizePathMock
            .setup((n) => n(directory))
            .returns(() => normalizedPath)
            .verifiable();
        fsMock.setup((f) => f.existsSync(normalizedPath)).returns(() => false);
        fsMock.setup((f) => f.mkdirSync(normalizedPath, { recursive: true })).verifiable();

        const result = ensureDirectoryImpl(directory, fsMock.object, normalizePathMock.object);
        expect(result).toEqual(normalizedPath);
    });

    it('does not create directory if it already exists', () => {
        normalizePathMock
            .setup((n) => n(directory))
            .returns(() => normalizedPath)
            .verifiable();
        fsMock.setup((f) => f.existsSync(normalizedPath)).returns(() => true);
        fsMock.setup((f) => f.mkdirSync(It.isAny(), It.isAny())).verifiable(Times.never());

        const result = ensureDirectoryImpl(directory, fsMock.object, normalizePathMock.object);
        expect(result).toEqual(normalizedPath);
    });
});
