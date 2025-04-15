// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { InvocationContext, HttpRequest, HttpResponse, Timer } from '@azure/functions';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { WebApiErrorCode } from './web-api-error-codes';
import { WebHttpResponse } from './web-http-response';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AppContext {
    timer?: Timer;
    request?: HttpRequest;
    context: InvocationContext;
}

@injectable()
export abstract class WebController {
    public appContext: AppContext;

    public abstract readonly apiVersion: string;

    public abstract readonly apiName: string;

    constructor(@inject(GlobalLogger) protected readonly logger: GlobalLogger) {}

    public async invoke(appContext: AppContext, ...args: any[]): Promise<any> {
        this.appContext = appContext;

        try {
            this.logger.setCommonProperties(this.getBaseTelemetryProperties());
            this.logger.logInfo(`Executing '${this.appContext.context?.functionName}' function app.`);

            const webApiErrorCode = await this.validateRequest(...args);

            let response;
            if (webApiErrorCode !== undefined) {
                response = WebHttpResponse.getErrorResponse(webApiErrorCode);
            } else {
                response = await this.handleRequest(...args);
            }

            this.setResponseContentTypeHeader(response);

            return response;
        } catch (error) {
            this.logger.logError('Encountered an error while processing HTTP web request.', { error: System.serializeError(error) });
            throw error;
        }
    }

    protected abstract validateRequest(...args: any[]): Promise<WebApiErrorCode>;

    protected abstract handleRequest(...args: any[]): Promise<any>;

    protected getBaseTelemetryProperties(): { [name: string]: string } {
        return {
            apiName: this.apiName,
            apiVersion: this.apiVersion,
            controller: this.constructor.name,
            functionName: this.appContext.context?.functionName,
            invocationId: this.appContext.context?.invocationId,
        };
    }

    private setResponseContentTypeHeader(response: HttpResponse): void {
        if (response !== undefined && this.appContext.context?.options?.trigger?.type === 'httpTrigger') {
            if (response.headers && !response.headers.has('content-type')) {
                response.headers.set('content-type', 'application/json; charset=utf-8');
                response.headers.set('X-Content-Type-Options', 'nosniff');
            }
        }
    }
}
