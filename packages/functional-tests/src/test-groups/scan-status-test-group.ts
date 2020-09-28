// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { expect } from 'chai';
import { WebApiErrorCodes } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class ScanStatusTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testGetScanStatus(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);

        this.ensureResponseSuccessStatusCode(response);
        expect(response.body.scanId, 'Get Scan Response should return the Scan ID that we queried').to.be.equal(
            this.testContextData.scanId,
        );
    }

    @test(TestEnvironment.all)
    public async testGetScanStatusWithInvalidGuid(): Promise<void> {
        const invalidGuid = 'invalid guid';
        const response = await this.a11yServiceClient.getScanStatus(invalidGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    @test(TestEnvironment.all)
    public async testGetScanStatusWithInvalidScanId(): Promise<void> {
        //Guid with a timestamp in 2607.
        const invalidGuid: string = '47cd7291-a928-6c96-bdb8-4be18b5a1305';
        const response = await this.a11yServiceClient.getScanStatus(invalidGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }
}
