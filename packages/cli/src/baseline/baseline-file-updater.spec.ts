// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, MockBehavior } from 'typemoq';
import { OutputFileWriter } from '../files/output-file-writer';
import { ScanArguments } from '../scan-arguments';
import { BaselineFileUpdater } from './baseline-file-updater';
import { BaselineFileFormatter } from './baseline-file-formatter';
import { BaselineEvaluation, BaselineFileContent } from './baseline-types';

describe(BaselineFileUpdater, () => {
    const baselineFileFormatterOutput = 'BaselineFileFormatter.format output';
    let baselineFileFormatterMock: IMock<BaselineFileFormatter>;
    let outputFileWriterMock: IMock<OutputFileWriter>;
    let testSubject: BaselineFileUpdater;
    let stdout: string[];

    const noopEvaluation: BaselineEvaluation = {
        suggestedBaselineUpdate: null,
        totalNewViolations: 0,
        totalFixedViolations: 0,
        newViolationsByRule: {},
        fixedViolationsByRule: {},
        totalBaselineViolations: 0,
    };
    const updateSuggestedEvaluation: BaselineEvaluation = {
        suggestedBaselineUpdate: {} as BaselineFileContent,
        totalNewViolations: 1,
        totalFixedViolations: 0,
        newViolationsByRule: { 'rule-1': 1 },
        fixedViolationsByRule: {},
        totalBaselineViolations: 0,
    };

    beforeEach(() => {
        baselineFileFormatterMock = Mock.ofType<BaselineFileFormatter>(null, MockBehavior.Strict);
        outputFileWriterMock = Mock.ofType<OutputFileWriter>(null, MockBehavior.Strict);

        stdout = [];
        const stdoutWriter = (s: string) => stdout.push(s);

        testSubject = new BaselineFileUpdater(baselineFileFormatterMock.object, outputFileWriterMock.object, stdoutWriter);
    });

    afterEach(() => {
        baselineFileFormatterMock.verifyAll();
        outputFileWriterMock.verifyAll();
    });

    describe('with updateBaseline', () => {
        const scanArguments: ScanArguments = {
            output: '/scan-arguments/output',
            baselineFile: '/scan-arguments/baselineFile',
            updateBaseline: true,
        };

        it('updates baselineFile in-place', async () => {
            setupSuccessfulBaselineFileFormatter();

            outputFileWriterMock
                .setup((m) => m.writeToFile(scanArguments.baselineFile, baselineFileFormatterOutput))
                .returns(() => '/path/from/output-file-writer');

            await testSubject.updateBaseline(scanArguments, updateSuggestedEvaluation);

            expect(stdout).toMatchInlineSnapshot(`
                Array [
                  "Found 1 new violations compared to the baseline.",
                  "Found 0 cases where a previously baselined violation was fixed.",
                  "Saved updated baseline file at /path/from/output-file-writer",
                ]
            `);
        });

        it('propagates errors from baselineFileFormatter', async () => {
            const formatError = new Error('from BaselineFileFormatter');
            baselineFileFormatterMock.setup((f) => f.format(It.isAny())).throws(formatError);

            await expect(testSubject.updateBaseline(scanArguments, updateSuggestedEvaluation)).rejects.toThrowError(formatError);
        });

        it('propagates errors from writeToFile', async () => {
            setupSuccessfulBaselineFileFormatter();

            const writeError = new Error('from OutputFileWriter');
            outputFileWriterMock.setup((m) => m.writeToFile(scanArguments.baselineFile, baselineFileFormatterOutput)).throws(writeError);

            await expect(testSubject.updateBaseline(scanArguments, updateSuggestedEvaluation)).rejects.toThrowError(writeError);
        });
    });

    describe('without updateBaseline', () => {
        const scanArguments: ScanArguments = {
            output: '/scan-arguments/output',
            baselineFile: '/scan-arguments/baselineFile',
        };

        it('writes a new baselineFile to output if updateBaseline is not specified', async () => {
            setupSuccessfulBaselineFileFormatter();

            outputFileWriterMock
                .setup((m) =>
                    m.writeToDirectoryWithOriginalFilename(scanArguments.output, scanArguments.baselineFile, baselineFileFormatterOutput),
                )
                .returns(() => '/path/from/output-file-writer.baseline');

            await testSubject.updateBaseline(scanArguments, updateSuggestedEvaluation);

            expect(stdout).toMatchInlineSnapshot(`
Array [
  "Found 1 new violations compared to the baseline.",
  "Found 0 cases where a previously baselined violation was fixed.",
  "Saved new baseline file at /path/from/output-file-writer.baseline",
  "To update the baseline with these changes, either rerun with --updateBaseline or copy the updated baseline file to /scan-arguments/baselineFile",
]
`);
        });

        it('propagates errors from baselineFileFormatter', async () => {
            const formatError = new Error('from BaselineFileFormatter');
            baselineFileFormatterMock.setup((f) => f.format(It.isAny())).throws(formatError);

            await expect(testSubject.updateBaseline(scanArguments, updateSuggestedEvaluation)).rejects.toThrowError(formatError);
        });

        it('propagates errors from writeToDirectoryWithOriginalFilename', async () => {
            setupSuccessfulBaselineFileFormatter();

            const writeError = new Error('from OutputFileWriter');
            outputFileWriterMock
                .setup((m) =>
                    m.writeToDirectoryWithOriginalFilename(scanArguments.output, scanArguments.baselineFile, baselineFileFormatterOutput),
                )
                .throws(writeError);

            await expect(testSubject.updateBaseline(scanArguments, updateSuggestedEvaluation)).rejects.toThrowError(writeError);
        });
    });

    it('noops if baselineFile is not set', async () => {
        const scanArguments = { output: '/output' };
        await testSubject.updateBaseline(scanArguments, updateSuggestedEvaluation);

        expect(stdout).toStrictEqual([]);
    });

    it('noops if the baselineEvaluation is not set', async () => {
        const scanArguments: ScanArguments = {
            output: '/output',
            baselineFile: './a11y.baseline',
        };
        await testSubject.updateBaseline(scanArguments, undefined);

        expect(stdout).toStrictEqual([]);
    });

    it('noops if the baselineEvaluation does not suggest an update', async () => {
        const scanArguments: ScanArguments = {
            output: '/output',
            baselineFile: './a11y.baseline',
        };
        await testSubject.updateBaseline(scanArguments, noopEvaluation);

        expect(stdout).toStrictEqual([]);
    });

    function setupSuccessfulBaselineFileFormatter(): void {
        baselineFileFormatterMock.setup((f) => f.format(It.isAny())).returns(() => baselineFileFormatterOutput);
    }
});
