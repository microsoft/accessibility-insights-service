// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { RestApiConfig, ServiceConfiguration } from 'common';
import { injectable } from 'inversify';
import { HttpResponse } from './http-response';
import { WebApiErrorCodes } from './web-api-error-codes';
import { WebController } from './web-controller';

// tslint:disable: no-any

@injectable()
export abstract class ApiController extends WebController {
    protected abstract readonly serviceConfig: ServiceConfiguration;

    public hasPayload(): boolean {
        return this.context.req.rawBody !== undefined;
    }

    public tryGetPayload<T>(): T {
        try {
            // tslint:disable-next-line: no-unsafe-any
            return JSON.parse(this.context.req.rawBody);
        } catch (error) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.invalidJsonDocument);
        }

        return undefined;
    }

    protected validateRequest(...args: any[]): boolean {
        if (!this.validateApiVersion() || !this.validateContentType()) {
            return false;
        }

        return true;
    }

    protected validateContentType(): boolean {
        if (this.context.req.method !== 'POST' && this.context.req.method !== 'PUT') {
            return true;
        }

        if (!this.hasPayload()) {
            this.context.res = {
                status: 204, // No Content
            };

            return false;
        }

        if (this.context.req.headers === undefined || this.context.req.headers['content-type'] === undefined) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.missingContentTypeHeader);

            return false;
        }

        if (this.context.req.headers['content-type'] !== 'application/json') {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedContentType);

            return false;
        }

        return true;
    }

    protected validateApiVersion(): boolean {
        if (this.context.req.query === undefined || this.context.req.query['api-version'] === undefined) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.missingApiVersionQueryParameter);

            return false;
        }

        if (this.context.req.query['api-version'] !== this.apiVersion) {
            this.context.res = HttpResponse.getErrorResponse(WebApiErrorCodes.unsupportedApiVersion);

            return false;
        }

        return true;
    }

    protected async getRestApiConfig(): Promise<RestApiConfig> {
        return this.serviceConfig.getConfigValue('restApiConfig');
    }
}
