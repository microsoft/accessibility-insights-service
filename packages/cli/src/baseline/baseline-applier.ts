// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ScanArguments } from '..';
import { CombinedScanResult } from '../crawler/ai-crawler';
import { BaselineGenerator } from './baseline-generator';

@injectable()
export class BaselineApplier {
    constructor(
        @inject(BaselineDiffer) private readonly baselineDiffer: BaselineDiffer,
        @inject(BaselineDiskReader) private readonly baselineDiskReader: BaselineDiskReader,
        @inject(BaselineDiskWriter) private readonly baselineDiskWriter: BaselineDiskWriter,
        @inject(BaselineGenerator) private readonly baselineGenerator: BaselineGenerator,
    ) {}

    public async applyBaseline(
        scanArguments: ScanArguments,
        combinedScanResult: CombinedScanResult
    ): Promise<CombinedScanResult> {
        if (isEmpty(scanArguments.baselineFile)) {
            return combinedScanResult;
        }

        const oldBaselineContent = await this.baselineDiskReader.tryReadFile(scanArguments.baselineFile);
        const newBaselineContent = await this.baselineGenerator.generateBaseline(combinedScanResult);
        const baselineDiff = await this.baselineDiffer.diff(oldBaselineContent, newBaselineContent);

        if (baselineDiff.updateRequired) {
            console.log(baselineDiff.summaryMessage);

            if (scanArguments.updateBaseline) {
                console.log(`Updating baseline file ${scanArguments.baselineFile}...`);
                await this.baselineDiskWriter.writeToFile(scanArguments.baselineFile, newBaselineContent);
            } else {
                const updatedBaselineLocation = await this.baselineDiskWriter.writeToDirectory(
                    scanArguments.output, scanArguments.baselineFile, newBaselineContent);

                console.log(`Updated baseline file was saved as ${updatedBaselineLocation}`);
                console.log(`To update the baseline with these changes, either rerun with --updateBaseline or copy the updated baseline file to ${scanArguments.baselineFile}`);
            }
        }

        return baselineDiff.baselineAdjustedScanResults;
    }
}
