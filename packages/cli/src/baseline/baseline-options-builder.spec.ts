// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import { IMock, Mock } from 'typemoq';
import { BaselineFileContent } from './baseline-types';
import { BaselineOptionsBuilder } from './baseline-options-builder';
import { BaselineFileFormatter } from './baseline-file-formatter';

describe(BaselineOptionsBuilder, () => {
    let baselineFileFormatterMock: IMock<BaselineFileFormatter>;
    let fsMock: IMock<typeof fs>;
    let testSubject: BaselineOptionsBuilder;

    beforeEach(() => {
        baselineFileFormatterMock = Mock.ofType<BaselineFileFormatter>();
        fsMock = Mock.ofInstance(fs);
        testSubject = new BaselineOptionsBuilder(baselineFileFormatterMock.object, fsMock.object);
    });

    it('produces null options if no baseline scanArguments are specified', () => {
        expect(testSubject.build({ })).toBeNull();
    });

    it('throws an Error if updateBaseline is specified without baselineFile', () => {
        expect(() => testSubject.build({ updateBaseline: true })).toThrowErrorMatchingInlineSnapshot(
            `"updateBaseline is only supported when baselineFile is specified"`,
        );
    });

    it('propagates non-ENOENT filesystem errors', () => {
        const baselineFileInput = '/path/to/baseline';
        const nonEnoentError = new Error('from readFileSync');

        fsMock.setup((f) => f.readFileSync(baselineFileInput, { encoding: 'utf8' })).throws(nonEnoentError);

        expect(() => testSubject.build({ baselineFile: baselineFileInput })).toThrowError(nonEnoentError);
    });

    it('propagates parse errors', () => {
        const baselineFileInput = '/path/to/baseline';
        const readFileSyncOutput = 'readFileSync output';
        const parseError = new Error('from parse');

        fsMock.setup((f) => f.readFileSync(baselineFileInput, { encoding: 'utf8' })).returns(() => readFileSyncOutput);
        baselineFileFormatterMock.setup((f) => f.parse(readFileSyncOutput)).throws(parseError);

        expect(() => testSubject.build({ baselineFile: baselineFileInput })).toThrowError(parseError);
    });

    it('parses scanArguments to produce output when baselineFile exists', () => {
        const baselineFileInput = '/path/to/baseline';
        const readFileSyncOutput = 'readFileSync output';
        const parseOutput = {} as BaselineFileContent;

        fsMock.setup((f) => f.readFileSync(baselineFileInput, { encoding: 'utf8' })).returns(() => readFileSyncOutput);
        baselineFileFormatterMock.setup((f) => f.parse(readFileSyncOutput)).returns(() => parseOutput);

        const output = testSubject.build({ baselineFile: baselineFileInput });
        expect(output.baselineContent).toBe(parseOutput);

        expect(output.urlNormalizer).toBeUndefined();
    });

    it('parses scanArguments to produce output when baselineFile does not exist', () => {
        const baselineFileInput = '/path/to/baseline';

        const enoentError = new Error('ENOENT from readFileSync');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (enoentError as any).code = 'ENOENT';

        fsMock.setup((f) => f.readFileSync(baselineFileInput, { encoding: 'utf8' })).throws(enoentError);

        const output = testSubject.build({ baselineFile: baselineFileInput });
        expect(output.baselineContent).toBeNull();

        expect(output.urlNormalizer).toBeUndefined();
    });
});
