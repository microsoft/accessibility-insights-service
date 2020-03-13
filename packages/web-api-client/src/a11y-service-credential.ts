// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AuthenticationContext, TokenResponse } from 'adal-node';
import { Logger } from 'logger';
import * as requestPromise from 'request-promise';
import { isNullOrUndefined } from 'util';

export class A11yServiceCredential {
    private readonly authContext: AuthenticationContext;

    constructor(
        private readonly clientId: string,
        private readonly clientSecret: string,
        private readonly resourceId: string,
        authorityUrl: string,
        private readonly logger: Logger,
        context?: AuthenticationContext,
        private readonly maxTokenAttempts: number = 5,
    ) {
        // tslint:disable-next-line: no-any no-unsafe-any strict-boolean-expressions
        this.authContext = context || new (<any>AuthenticationContext)(authorityUrl, undefined, undefined, '');
    }

    public async getToken(): Promise<TokenResponse> {
        await this.logger.setup();

        let lastError: Error;
        for (let i = 0; i < this.maxTokenAttempts; i += 1) {
            try {
                return await this.tryGetToken();
            } catch (err) {
                lastError = err as Error;
                this.logger.logError(`Auth getToken call failed with error: ${JSON.stringify(err)}`);
            }
        }
        this.logger.logError(`Could not get auth token after ${this.maxTokenAttempts} attempts.`);
        throw lastError;
    }

    public async signRequest(request: typeof requestPromise): Promise<typeof requestPromise> {
        const accessToken = await this.getToken();
        const authOptions: requestPromise.RequestPromiseOptions = {
            headers: {
                authorization: `${accessToken.tokenType} ${accessToken.accessToken}`,
            },
        };

        return request.defaults(authOptions);
    }

    private async getTokenWithRetries(numRetries: number): Promise<TokenResponse> {
        try {
            return await this.tryGetToken();
        } catch (err) {
            this.logger.logError(`Auth getToken call failed with error: ${JSON.stringify(err)}`);
            if (numRetries > 0) {
                return this.getTokenWithRetries(numRetries - 1);
            } else {
                this.logger.logError(`Could not get auth token after ${this.maxTokenAttempts} retries.`);
                throw err;
            }
        }
    }

    private async tryGetToken(): Promise<TokenResponse> {
        return new Promise((resolve, reject) => {
            this.authContext.acquireTokenWithClientCredentials(this.resourceId, this.clientId, this.clientSecret, (err, tokenResponse) => {
                if (!isNullOrUndefined(err)) {
                    reject(err);
                } else {
                    resolve(tokenResponse as TokenResponse);
                }
            });
        });
    }
}
