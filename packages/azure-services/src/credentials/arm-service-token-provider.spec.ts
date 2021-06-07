// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AccessToken, ChainedTokenCredential } from '@azure/identity';
import { RetryHelper, System } from 'common';
import { IMock, It, Mock, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { ARMServiceTokenProvider } from './arm-service-token-provider';

describe(ARMServiceTokenProvider, () => {
    let retryHelperMock: IMock<RetryHelper<AccessToken>>;
    let loggerMock: IMock<MockableLogger>;
    let tokenProviderMock: IMock<ChainedTokenCredential>;
    const scope = 'scope';
    const maxRetries = 3;

    let testSubject: ARMServiceTokenProvider;

    beforeEach(() => {
        retryHelperMock = Mock.ofType<RetryHelper<AccessToken>>();
        loggerMock = Mock.ofType<MockableLogger>();
        tokenProviderMock = Mock.ofType<ChainedTokenCredential>();

        testSubject = new ARMServiceTokenProvider(
            retryHelperMock.object,
            loggerMock.object,
            () => tokenProviderMock.object,
            scope,
            maxRetries,
        );
    });

    afterEach(() => {
        retryHelperMock.verifyAll();
        tokenProviderMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('retrieves token with retries', async () => {
        const accessTokenStub = {} as AccessToken;

        retryHelperMock
            .setup((rh) => rh.executeWithRetries(It.isAny(), It.isAny(), maxRetries))
            .returns(async (action, onRetry, maxRetryCount) => action())
            .verifiable(Times.once());

        tokenProviderMock
            .setup((tp) => tp.getToken(scope))
            .returns(async () => accessTokenStub)
            .verifiable(Times.once());

        const recievedToken = await testSubject.getToken();

        expect(recievedToken).toBe(accessTokenStub);
    });

    it('Logs error on retry', async () => {
        const error = new Error('test error');
        const expectedLogMessage = 'Failed to get ARM service token. Retrying on error';

        retryHelperMock
            .setup((rh) => rh.executeWithRetries(It.isAny(), It.isAny(), maxRetries))
            .returns(async (action, onRetry, maxRetryCount) => onRetry(error))
            .verifiable(Times.once());

        loggerMock.setup((l) => l.logError(expectedLogMessage, { error: System.serializeError(error) })).verifiable(Times.once());

        await testSubject.getToken();
    });
});
