// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { RestApiConfig, ServiceConfiguration } from 'common';
import { injectable } from 'inversify';
import { Logger } from 'logger';

@injectable()
export abstract class ApiController {
    public abstract readonly apiVersion: string;
    public abstract readonly apiName: string;
    protected abstract readonly context: Context;
    protected abstract readonly logger: Logger;
    protected abstract readonly serviceConfig: ServiceConfiguration;

    public abstract async handleRequest(): Promise<void>;

    public async invoke(): Promise<void> {
        if (this.validateRequest()) {
            await this.handleRequest();
        }
    }

    public validateRequest(): boolean {
        if (!this.validateApiVersion() || !this.validateContentType()) {
            return false;
        }

        return true;
    }

    public validateContentType(): boolean {
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
            this.context.res = {
                status: 400, // Bad Request
                body: 'Content type was not specified',
            };

            return false;
        }

        if (this.context.req.headers['content-type'] !== 'application/json') {
            this.context.res = {
                status: 415, // Unsupported Media Type
                body: 'Content type is not supported',
            };

            return false;
        }

        return true;
    }

    public validateApiVersion(): boolean {
        if (this.context.req.query === undefined || this.context.req.query['api-version'] === undefined) {
            this.context.res = {
                status: 400, // Bad Request
                body: 'Client API version was not specified',
            };

            return false;
        }

        if (this.context.req.query['api-version'] !== this.apiVersion) {
            this.context.res = {
                status: 400, // Bad Request
                body: 'Client API version is not supported',
            };

            return false;
        }

        return true;
    }

    public hasPayload(): boolean {
        return this.context.req.rawBody !== undefined;
    }

    public tryGetPayload<T>(): T {
        try {
            // tslint:disable-next-line: no-unsafe-any
            return JSON.parse(this.context.req.rawBody);
        } catch (error) {
            this.context.res = {
                status: 400, // Bad Request
                body: `Malformed request body. ${error}`,
            };
        }

        return undefined;
    }

    protected async getRestApiConfig(): Promise<RestApiConfig> {
        return this.serviceConfig.getConfigValue('restApiConfig');
    }
}
