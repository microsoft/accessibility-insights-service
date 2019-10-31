// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';

@injectable()
export class WebApiClient {
    private readonly baseUrl: string;

    constructor(private readonly functionAppName: string) {
        this.baseUrl = `https://${functionAppName}.azurewebsites.net`;
    }

    public postScanUrl(url: string, priority?: number): void {
        console.log('hello from ', this.baseUrl);
    }
}
