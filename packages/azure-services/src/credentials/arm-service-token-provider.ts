// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AccessToken, ChainedTokenCredential, DefaultAzureCredential } from '@azure/identity';
import { RetryHelper, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';

const ARMApiScope = 'https://management.azure.com/';

export type TokenCredentialProvider = () => ChainedTokenCredential;
const getDefaultTokenProvider = () => new DefaultAzureCredential();

@injectable()
export class ARMServiceTokenProvider {
    constructor(
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<AccessToken>,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly tokenCredentialProvider: TokenCredentialProvider = getDefaultTokenProvider,
        private readonly scope: string = ARMApiScope,
        private readonly maxRetries: number = 3,
    ) {}

    public async getToken(): Promise<AccessToken> {
        return this.retryHelper.executeWithRetries(
            () => this.tokenCredentialProvider().getToken(this.scope),
            async (e: Error) => {
                this.logger.logError('Failed to get ARM service token. Retrying on error', { error: System.serializeError(e) });
            },
            this.maxRetries,
        );
    }
}
