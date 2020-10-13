// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { isNil } from 'lodash';
import { AuthenticationContext, TokenResponse } from 'adal-node';
import { RetryHelper, System } from 'common';
import { Logger } from 'logger';
import { ExtendOptions, Got } from 'got';

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
        private readonly msecBetweenRetries: number = 1000,
        private readonly retryHelper: RetryHelper<TokenResponse> = new RetryHelper(),
    ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, , @typescript-eslint/strict-boolean-expressions
        this.authContext = context || new (<any>AuthenticationContext)(authorityUrl, undefined, undefined, '');
    }

    public async getToken(): Promise<TokenResponse> {
        try {
            return await this.retryHelper.executeWithRetries(
                () => this.tryGetToken(),
                (err: Error) => this.handleGetTokenError(err),
                this.maxTokenAttempts,
                this.msecBetweenRetries,
            );
        } catch (error) {
            throw new Error(`Error while acquiring Azure AD client token. ${System.serializeError(error)}`);
        }
    }

    public async getHeaders(): Promise<Record<string, string | string[]>> {
        const accessToken = await this.getToken();

        return { authorization: `${accessToken.tokenType} ${accessToken.accessToken}` };
    }

    public async signRequest(gotRequest: Got): Promise<Got> {
        const accessToken = await this.getToken();
        const authOptions: ExtendOptions = {
            headers: {
                authorization: `${accessToken.tokenType} ${accessToken.accessToken}`,
            },
        };

        return gotRequest.extend(authOptions);
    }

    private async tryGetToken(): Promise<TokenResponse> {
        return new Promise((resolve, reject) => {
            this.authContext.acquireTokenWithClientCredentials(this.resourceId, this.clientId, this.clientSecret, (err, tokenResponse) => {
                if (!isNil(err)) {
                    reject(err);
                } else {
                    resolve(tokenResponse as TokenResponse);
                }
            });
        });
    }

    private async handleGetTokenError(err: Error): Promise<void> {
        this.logger.logError(`Error while acquiring Azure AD client token. ${System.serializeError(err)}`);
    }
}
