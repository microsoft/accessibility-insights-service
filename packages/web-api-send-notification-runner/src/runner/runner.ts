// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ScanMetadataConfig } from '../scan-metadata-config';

// tslint:disable: no-null-keyword no-any

@injectable()
export class Runner {
    constructor(
        @inject(ScanMetadataConfig) private readonly scanMetadataConfig: ScanMetadataConfig,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async run(): Promise<void> {
        const scanMetadata = this.scanMetadataConfig.getConfig();
        this.logger.logInfo(`Id: ${scanMetadata.id}`);
        this.logger.logInfo(`Reply URL: ${scanMetadata.replyUrl}`);
    }
}
