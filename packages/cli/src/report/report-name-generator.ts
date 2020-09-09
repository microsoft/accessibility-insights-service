// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { ReportNameGeneratorBuilder } from './report-name-generator-builder';

@injectable()
export class ReportNameGenerator {
    constructor(@inject(ReportNameGeneratorBuilder) private readonly reportNameGeneratorBuilder: ReportNameGeneratorBuilder) {}

    public generateName(baseName: string, scanDate: Date): string {
        return `${baseName}-${this.reportNameGeneratorBuilder.getDateSegment(scanDate)}-${this.reportNameGeneratorBuilder.getTimeSegment(
            scanDate,
        )}`;
    }
}
