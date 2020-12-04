// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable, inject } from 'inversify';
import { GuidGenerator } from 'common';

@injectable()
export class DataProvidersCommon {
    public static readonly reportBlobContainerName = 'page-scan-run-reports';
    public static readonly combinedResultsBlobContainerName = 'combined-scan-results';

    constructor(@inject(GuidGenerator) private readonly guidGenerator: GuidGenerator) {}

    public getBlobName(fileId: string): string {
        const fileCreatedTime = this.guidGenerator.getGuidTimestamp(fileId);

        return `${fileCreatedTime.getUTCFullYear()}/${
            fileCreatedTime.getUTCMonth() + 1
        }/${fileCreatedTime.getUTCDate()}/${fileCreatedTime.getUTCHours()}/${fileId}`;
    }
}
