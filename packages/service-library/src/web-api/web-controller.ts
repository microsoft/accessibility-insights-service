// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Context } from '@azure/functions';
import { injectable } from 'inversify';

@injectable()
export abstract class WebController {
    public abstract readonly apiVersion: string;
    public abstract readonly apiName: string;
    public context: Context;

    // tslint:disable-next-line: no-any
    public abstract async invoke(requestContext: Context, ...args: any[]): Promise<void>;
}
