// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScanMetadata } from '../types/scan-metadata';
import { Runner } from './runner';

// tslint:disable: no-any mocha-no-side-effect-code no-object-literal-type-assertion no-unsafe-any no-null-keyword

class MockableLogger extends Logger {}

describe(Runner, () => {
    let runner: Runner;
    let scanMetadataConfigMock: IMock<ScanMetadataConfig>;
    let loggerMock: IMock<MockableLogger>;
    const scanMetadata: ScanMetadata = {
        id: 'id',
        replyUrl: 'replyUrl',
    };

    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        scanMetadataConfigMock = Mock.ofType(ScanMetadataConfig);
        scanMetadataConfigMock.setup(s => s.getConfig()).returns(() => scanMetadata);

        runner = new Runner(
            scanMetadataConfigMock.object,
            loggerMock.object,
        );
    });

    it('Run', async () => {
        loggerMock.setup(lm => lm.logInfo(`Id: ${scanMetadata.id}`)).verifiable(Times.once());
        loggerMock.setup(lm => lm.logInfo(`Reply URL: ${scanMetadata.replyUrl}`)).verifiable(Times.once());

        await runner.run();
    });

    afterEach(() => {
        scanMetadataConfigMock.verifyAll();
        loggerMock.verifyAll();
    });

});
