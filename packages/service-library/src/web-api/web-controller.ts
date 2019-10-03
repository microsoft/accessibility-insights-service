// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { injectable } from 'inversify';

// tslint:disable: no-any no-unsafe-any

@injectable()
export abstract class WebController {
    public abstract readonly apiVersion: string;
    public abstract readonly apiName: string;
    public context: Context;

    public async invoke(requestContext: Context, ...args: any[]): Promise<void> {
        this.context = requestContext;
        if (this.validateRequest(...args)) {
            await this.handleRequest(...args);
        }

        this.setResponseContentTypeHeader();
    }

    protected abstract validateRequest(...args: any[]): boolean;

    protected abstract async handleRequest(...args: any[]): Promise<void>;

    private setResponseContentTypeHeader(): void {
        if (this.context !== undefined && this.context.res !== undefined) {
            const jsonContentType = 'application/json; charset=utf-8';
            if (this.context.res.headers === undefined) {
                this.context.res.headers = {
                    'content-type': jsonContentType,
                };
            } else if (this.context.res.headers['content-type'] === undefined) {
                this.context.res.headers['content-type'] = jsonContentType;
            }
        }
    }
}
