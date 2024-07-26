// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RestApiConfig, ServiceConfiguration } from 'common';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { WebApiErrorCode, WebApiErrorCodes } from './web-api-error-codes';
import { WebController } from './web-controller';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export abstract class ApiController extends WebController {
    protected abstract readonly serviceConfig: ServiceConfiguration;

    protected body: string;

    /**
     * Try parse a JSON string from the HTTP request body.
     * Returns undefined if parsing was unsuccessful; otherwise object representation of a JSON string.
     */
    public async tryGetPayload<T>(): Promise<T> {
        if (this.appContext.request?.bodyUsed === false) {
            this.body = await this.appContext.request.text();
        }

        if (!isEmpty(this.body)) {
            try {
                const payload = JSON.parse(this.body);

                return isEmpty(payload) ? undefined : payload;
            } catch {
                /* empty */
            }
        }

        return undefined;
    }

    protected async validateRequest(...args: any[]): Promise<WebApiErrorCode> {
        return this.validateApiVersion() ?? this.validateContentType();
    }

    protected async validateContentType(): Promise<WebApiErrorCode> {
        if (this.appContext.request?.method && this.appContext.request.method.toUpperCase() === 'POST') {
            if (isEmpty(await this.tryGetPayload())) {
                return WebApiErrorCodes.invalidJsonDocument;
            }

            if (this.appContext.request?.headers === undefined || isEmpty(this.appContext.request.headers.get('content-type'))) {
                return WebApiErrorCodes.missingContentTypeHeader;
            }

            if (this.appContext.request.headers.get('content-type') !== 'application/json') {
                return WebApiErrorCodes.unsupportedContentType;
            }
        }

        return undefined;
    }

    protected validateApiVersion(): WebApiErrorCode {
        if (this.appContext.request?.query === undefined || isEmpty(this.appContext.request.query.get('api-version'))) {
            return WebApiErrorCodes.missingApiVersionQueryParameter;
        }

        if (this.appContext.request.query.get('api-version') !== this.apiVersion) {
            return WebApiErrorCodes.unsupportedApiVersion;
        }

        return undefined;
    }

    protected async getRestApiConfig(): Promise<RestApiConfig> {
        return this.serviceConfig.getConfigValue('restApiConfig');
    }
}
