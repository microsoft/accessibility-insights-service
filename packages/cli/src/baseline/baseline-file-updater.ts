// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { OutputFileWriter } from '../files/output-file-writer';
import { ScanArguments } from '../scan-arguments';
import { BaselineFileFormatter } from './baseline-file-formatter';
import { BaselineEvaluation } from './baseline-types';

@injectable()
export class BaselineFileUpdater {
    constructor(
        @inject(BaselineFileFormatter) private readonly baselineFileFormatter: BaselineFileFormatter,
        @inject(OutputFileWriter) private readonly outputFileWriter: OutputFileWriter,
        private readonly stdoutWriter: (output: string) => void = console.log,
    ) {}

    public async updateBaseline(scanArguments: ScanArguments, baselineEvaluation: BaselineEvaluation): Promise<void> {
        if (isEmpty(scanArguments.baselineFile) || baselineEvaluation?.suggestedBaselineUpdate == null) {
            return;
        }

        this.stdoutWriter(`Found ${baselineEvaluation.totalNewViolations} new violations compared to the baseline.`);
        this.stdoutWriter(`Found ${baselineEvaluation.totalFixedViolations} cases where a previously baselined violation was fixed.`);

        const newBaselineContent = baselineEvaluation.suggestedBaselineUpdate;
        const rawBaselineFileContent = this.baselineFileFormatter.format(newBaselineContent);

        if (scanArguments.updateBaseline) {
            const updatedBaselineLocation = await this.outputFileWriter.writeToFile(scanArguments.baselineFile, rawBaselineFileContent);

            this.stdoutWriter(`Updated existing baseline file at ${updatedBaselineLocation}`);
        } else {
            const updatedBaselineLocation = await this.outputFileWriter.writeToDirectoryWithOriginalFilename(
                scanArguments.output,
                scanArguments.baselineFile,
                rawBaselineFileContent,
            );

            this.stdoutWriter(`Saved new baseline file at ${updatedBaselineLocation}`);
            this.stdoutWriter(
                `To update the baseline with these changes, either rerun with --updateBaseline or copy the updated baseline file to ${scanArguments.baselineFile}`,
            );
        }
    }
}
