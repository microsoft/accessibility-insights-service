// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { getSerializableResponse, ResponseWithBodyType, RetryHelper, System } from 'common';
import got, { Got, Options } from 'got';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { GlobalLogger } from 'logger';
import { ARMServiceTokenProvider } from '../credentials/arm-service-token-provider';

export type CosmosDbKeys = {
    primaryMasterKey: string;
    primaryReadonlyMasterKey: string;
    secondaryMasterKey: string;
    secondaryReadonlyMasterKey: string;
};

@injectable()
export class CosmosKeyProvider {
    private readonly defaultRequestObject: Got;

    constructor(
        @inject(ARMServiceTokenProvider) private readonly tokenProvider: ARMServiceTokenProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<ResponseWithBodyType<CosmosDbKeys>>,
        requestObject: Got = got,
        private readonly apiVersion: string = '2020-04-01',
        private readonly maxRetries: number = 3,
    ) {
        this.defaultRequestObject = requestObject.extend({
            searchParams: {
                'api-version': this.apiVersion,
            },
            responseType: 'json',
            throwHttpErrors: true,
        });
    }

    public async getCosmosKey(cosmosDbApiBaseUrl: string): Promise<string> {
        const token = await this.tokenProvider.getToken();

        const endpoint = `${cosmosDbApiBaseUrl}/listKeys`;
        const options: Options = {
            headers: {
                authorization: `Bearer ${token.token}`,
            },
        };

        const response = await this.retryHelper.executeWithRetries(
            async () => (await this.defaultRequestObject.post(endpoint, options)) as ResponseWithBodyType<CosmosDbKeys>,
            async (e: Error) => {
                this.logger.logError('Failed to retrieve CosmosDB key. Retrying on error.', { error: System.serializeError(e) });
            },
            this.maxRetries,
        );

        if (isNil(response.body?.primaryMasterKey)) {
            const serializedResponse = JSON.stringify(getSerializableResponse(response));
            this.logger.logError('Response body did not contain CosmosDB primary key.', { response: serializedResponse });
            throw new Error('Failed to retrieve CosmosDB primary key');
        }

        return response.body.primaryMasterKey;
    }
}
