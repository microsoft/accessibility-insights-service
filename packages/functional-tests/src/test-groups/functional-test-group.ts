// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { getSerializableResponse, GuidGenerator, ResponseWithBodyType } from 'common';
import { inject } from 'inversify';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider, WebApiErrorCode } from 'service-library';
import { A11yServiceClient } from 'web-api-client';
import { TestContextData } from '../test-group-data';

/* eslint-disable @typescript-eslint/no-unused-expressions */

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

    public ensureResponseSuccessStatusCode(response: ResponseWithBodyType<unknown>, message?: string): void {
        const serializedResponse = JSON.stringify(getSerializableResponse(response));
        expect(response.statusCode >= 200 && response.statusCode <= 300, `${message} ${serializedResponse}`).to.be.true;
    }

    public expectWebApiErrorResponse(webApiErrorCode: WebApiErrorCode, response: ResponseWithBodyType<unknown>): void {
        const serializedResponse = JSON.stringify(getSerializableResponse(response));
        expect(response.statusCode, `Unexpected Web API response code. ${serializedResponse}`).to.be.equal(webApiErrorCode.statusCode);
    }
}
