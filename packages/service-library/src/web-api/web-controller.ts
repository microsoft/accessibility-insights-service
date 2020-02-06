// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ResultLevel } from 'storage-documents';

// tslint:disable: no-any no-unsafe-any

@injectable()
export abstract class WebController {
    public abstract readonly apiVersion: string;
    public abstract readonly apiName: string;
    public context: Context;

    constructor(@inject(Logger) protected readonly logger: Logger) {}

    public async invoke(requestContext: Context, ...args: any[]): Promise<unknown> {
        this.context = requestContext;

        try {
            await this.logger.setup(this.getBaseTelemetryProperties());

            this.logger.logInfo('[WebController] request started');

            let result: unknown;
            if (this.validateRequest(...args)) {
                result = await this.handleRequest(...args);
            }

            this.setResponseContentTypeHeader();

            this.logger.logInfo('[WebController] request completed');

            return result;
        } catch (error) {
            this.logger.trackExceptionAny(error, '[WebController] Request failed');
            throw error;
        }
    }

    protected abstract validateRequest(...args: any[]): boolean;

    protected abstract async handleRequest(...args: any[]): Promise<unknown>;

    protected getBaseTelemetryProperties(): { [name: string]: string } {
        return {
            apiName: this.apiName,
            apiVersion: this.apiVersion,
            controller: this.constructor.name,
            invocationId: this.context.invocationId,
        };
    }

    private setResponseContentTypeHeader(): void {
        if (this.context !== undefined && this.context.res !== undefined) {
            const jsonContentType = 'application/json; charset=utf-8';
            if (this.context.res.headers === undefined) {
                this.context.res.headers = {
                    'content-type': jsonContentType,
                    'X-Content-Type-Options': 'nosniff',
                };
            } else if (this.context.res.headers['content-type'] === undefined) {
                this.context.res.headers['content-type'] = jsonContentType;
                this.context.res.headers['X-Content-Type-Options'] = 'nosniff';
            }
        }
    }
}
