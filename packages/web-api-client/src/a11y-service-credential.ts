// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AuthenticationContext, TokenResponse } from 'adal-node';
import { RetryHelper } from 'common';
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
        private readonly millisBetweenRetries: number = 1000,
        private readonly retryHelper: RetryHelper<TokenResponse> = new RetryHelper(),
    ) {
        // tslint:disable-next-line: no-any no-unsafe-any strict-boolean-expressions
        this.authContext = context || new (<any>AuthenticationContext)(authorityUrl, undefined, undefined, '');
    }

    public async getToken(): Promise<TokenResponse> {
        try {
            return await this.retryHelper.executeWithRetries(
                () => this.tryGetToken(),
                (err: Error) => this.handleGetTokenError(err),
                this.maxTokenAttempts,
                this.millisBetweenRetries,
            );
        } catch (err) {
            throw new Error(`Auth getToken failed with error: ${JSON.stringify(err)}`);
        }
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

    private async handleGetTokenError(err: Error): Promise<void> {
        this.logger.logError(`Auth getToken call failed with error: ${JSON.stringify(err)}`);
    }
}
