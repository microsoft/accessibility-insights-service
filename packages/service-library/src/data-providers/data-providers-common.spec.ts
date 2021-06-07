// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { GuidGenerator } from 'common';
import { DataProvidersCommon } from './data-providers-common';

let guidGeneratorMock: IMock<GuidGenerator>;
let dataProvidersCommon: DataProvidersCommon;
let fileCreatedTime: Date;

describe(DataProvidersCommon, () => {
    beforeEach(() => {
        fileCreatedTime = new Date();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        dataProvidersCommon = new DataProvidersCommon(guidGeneratorMock.object);
    });

    afterEach(() => {
        guidGeneratorMock.verifyAll();
    });

    it('create report blob name', () => {
        const fileId = 'fileId';
        guidGeneratorMock
            .setup((o) => o.getGuidTimestamp(fileId))
            .returns(() => fileCreatedTime)
            .verifiable();
        const expectedBlobName = `${fileCreatedTime.getUTCFullYear()}/${
            fileCreatedTime.getUTCMonth() + 1
        }/${fileCreatedTime.getUTCDate()}/${fileCreatedTime.getUTCHours()}/${fileId}`;

        const actualBlobName = dataProvidersCommon.getBlobName(fileId);

        expect(actualBlobName).toEqual(expectedBlobName);
    });
});
