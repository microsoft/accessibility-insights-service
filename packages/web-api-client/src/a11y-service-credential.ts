// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RetryHelper, System } from 'common';
import { LogLevel, Logger } from 'logger';
import { ExtendOptions, Got } from 'got';
import * as msal from '@azure/msal-node';

export class A11yServiceCredential {
    constructor(
        private readonly clientId: string,
        private readonly clientSecret: string,
        private readonly scope: string,
        private readonly authority: string,
        private readonly logger: Logger,
        private readonly maxTokenAttempts: number = 5,
        private readonly msecBetweenRetries: number = 1000,
        private readonly retryHelper: RetryHelper<msal.AuthenticationResult> = new RetryHelper(),
        private readonly clientApplication?: msal.ConfidentialClientApplication,
    ) {
        this.clientApplication =
            this.clientApplication ??
            new msal.ConfidentialClientApplication({
                auth: {
                    authority: this.authority,
                    clientId: this.clientId,
                    clientSecret: this.clientSecret,
                },
                system: {
                    loggerOptions: {
                        loggerCallback: (level: msal.LogLevel, message: string) => {
                            const logLevel = level === msal.LogLevel.Error ? LogLevel.Error : LogLevel.Warn;
                            this.logger.log(message, logLevel);
                        },
                        logLevel: msal.LogLevel.Warning,
                    },
                },
            });
    }

    public async getToken(): Promise<msal.AuthenticationResult> {
        try {
            return await this.retryHelper.executeWithRetries(
                () => this.clientApplication.acquireTokenByClientCredential({ scopes: [`${this.scope}/.default`] }),
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

    private async handleGetTokenError(err: Error): Promise<void> {
        this.logger.logError(`Error while acquiring Azure AD client token. ${System.serializeError(err)}`);
    }
}
