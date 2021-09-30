// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ScanArguments } from '../scan-arguments';
import { CombinedScanResult } from '../crawler/ai-crawler';
import { BaselineOptions } from '../baseline/baseline-engine';

@injectable()
export class CrawlerCommandBaselineHandler {
    constructor(
        @inject(BaselineDiskReader) private readonly baselineDiskReader: BaselineDiskReader,
        @inject(BaselineDiskWriter) private readonly baselineDiskWriter: BaselineDiskWriter,
    ) {}

    public async buildBaselineOptions(scanArguments: ScanArguments): Promise<BaselineOptions | null> {
        if (scanArguments.baselineFile == null) {
            return null;
        }

        const baselineContent = await this.baselineDiskReader.readFromFile(scanArguments.baselineFile);

        return {
            baselineContent,
            urlNormalizationPatterns: [],
        };
    }

    public async updateBaseline(scanArguments: ScanArguments, combinedScanResult: CombinedScanResult): Promise<void> {
        const baselineEvaluation = combinedScanResult.baselineEvaluation;

        if (isEmpty(scanArguments.baselineFile) || baselineEvaluation?.suggestedBaselineUpdate == null) {
            return;
        }

        const newBaselineContent = baselineEvaluation.suggestedBaselineUpdate;

        console.log(`Found ${baselineEvaluation.totalNewViolations} new violations compared to the baseline.`);
        console.log(`Found ${baselineEvaluation.totalFixedViolations} cases where a previously baselined violation was fixed.`);

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
}
