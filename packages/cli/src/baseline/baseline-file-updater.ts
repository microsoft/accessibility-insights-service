// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { OutputFileWriter } from '../files/output-file-writer';
import { ScanArguments } from '../scan-arguments';
import { BaselineFileFormatter } from './baseline-file-formatter';
import { BaselineEvaluation, BaselineFileContent } from './baseline-types';

@injectable()
export class BaselineFileUpdater {
    constructor(
        @inject(BaselineFileFormatter) private readonly baselineFileFormatter: BaselineFileFormatter,
        @inject(OutputFileWriter) private readonly outputFileWriter: OutputFileWriter,
        private readonly consoleObj: typeof console = console,
    ) {}

    public async updateBaseline(scanArguments: ScanArguments, baselineEvaluation: BaselineEvaluation): Promise<void> {
        if (isEmpty(scanArguments.baselineFile) || baselineEvaluation?.suggestedBaselineUpdate == null) {
            return;
        }

        const newBaselineContent = baselineEvaluation.suggestedBaselineUpdate;

        this.consoleObj.log(`Found ${baselineEvaluation.totalNewViolations} new violations compared to the baseline.`);
        this.consoleObj.log(`Found ${baselineEvaluation.totalFixedViolations} cases where a previously baselined violation was fixed.`);

        if (scanArguments.updateBaseline) {
            const updatedBaselineLocation = await this.writeToFile(scanArguments.baselineFile, newBaselineContent);

            this.consoleObj.log(`Updated existing baseline file ${updatedBaselineLocation}`);
        } else {
            const updatedBaselineLocation = await this.writeToDirectory(
                scanArguments.output, scanArguments.baselineFile, newBaselineContent);

            this.consoleObj.log(`Updated baseline file was saved as ${updatedBaselineLocation}`);
            this.consoleObj.log(`To update the baseline with these changes, either rerun with --updateBaseline or copy the updated baseline file to ${scanArguments.baselineFile}`);
        }
    }

    private writeToDirectory(directory: string, fileName: string, baseline: BaselineFileContent): string {
        const rawBaselineFileContent = this.baselineFileFormatter.format(baseline);
        const filePath = this.outputFileWriter.writeToDirectory(directory, fileName, 'baseline', rawBaselineFileContent);

        return filePath;
    }

    private writeToFile(filePath: string, baseline: BaselineFileContent): string {
        const rawBaselineFileContent = this.baselineFileFormatter.format(baseline);
        const normalizedFilePath = this.outputFileWriter.writeToFile(filePath, rawBaselineFileContent);

        return normalizedFilePath;
    }
}
