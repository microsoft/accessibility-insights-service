// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { GuidGenerator } from 'common';
import { inject } from 'inversify';
import { OnDemandPageScanRunResultProvider, WebApiErrorCode } from 'service-library';
import { A11yServiceClient } from 'web-api-client';
import { SerializableResponse, TestContextData } from '../test-group-data';

// tslint:disable: no-unused-expression

export abstract class FunctionalTestGroup {
    public testContextData: TestContextData;

    constructor(
        @inject(A11yServiceClient) protected readonly a11yServiceClient: A11yServiceClient,
        @inject(OnDemandPageScanRunResultProvider) protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
    ) {}

    public setTestContext(testContextData: TestContextData): void {
        this.testContextData = testContextData;
    }

    public ensureResponseSuccessStatusCode(response: SerializableResponse, message?: string): void {
        expect(response.statusCode >= 200 && response.statusCode <= 300, `${message} ${JSON.stringify(response)}`).to.be.true;
    }

    public expectWebApiErrorResponse(webApiErrorCode: WebApiErrorCode, response: SerializableResponse): void {
        expect(response.statusCode, `Unexpected Web API response code. ${JSON.stringify(response)}`).to.be.equal(
            webApiErrorCode.statusCode,
        );
    }
}
