// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ResponseWithBodyType, RetryHelper, System } from 'common';
import { ExtendOptions, Got, Options } from 'got';
import { IMock, It, Mock, Times } from 'typemoq';
import { AccessToken } from '@azure/identity';
import { ARMServiceTokenProvider } from '../credentials/arm-service-token-provider';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { CosmosDbKeys, CosmosKeyProvider } from './cosmos-key-provider';

describe(CosmosKeyProvider, () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gotStub: any;
    let extendMock: IMock<(options: ExtendOptions) => Got>;
    let postMock: IMock<(url: string, options: Options) => unknown>;
    let tokenProviderMock: IMock<ARMServiceTokenProvider>;
    let loggerMock: IMock<MockableLogger>;
    let retryHelperMock: IMock<RetryHelper<ResponseWithBodyType<CosmosDbKeys>>>;

    const apiVersion = 'api version';
    const maxRetries = 3;

    let testSubject: CosmosKeyProvider;

    beforeEach(() => {
        extendMock = Mock.ofInstance(() => null);
        extendMock.setup((e) => e(It.isAny())).returns(() => gotStub);
        postMock = Mock.ofInstance(() => null);
        gotStub = {
            extend: extendMock.object,
            post: postMock.object,
        };
        tokenProviderMock = Mock.ofType<ARMServiceTokenProvider>();
        loggerMock = Mock.ofType<MockableLogger>();
        retryHelperMock = Mock.ofType<RetryHelper<ResponseWithBodyType<CosmosDbKeys>>>();
    });

    it('sets default options', () => {
        const expectedOptions: ExtendOptions = {
            searchParams: {
                'api-version': apiVersion,
            },
            responseType: 'json',
            throwHttpErrors: true,
        };
        extendMock.setup((e) => e(expectedOptions)).verifiable(Times.once());

        testSubject = new CosmosKeyProvider(
            tokenProviderMock.object,
            loggerMock.object,
            retryHelperMock.object,
            gotStub,
            apiVersion,
            maxRetries,
        );

        extendMock.verifyAll();
    });

    describe('getCosmosKey', () => {
        const baseUrl = 'https://url.com';
        const listKeysEndpoint = `${baseUrl}/listKeys`;
        const token = { token: 'test token' } as AccessToken;
        const primaryKey = 'master key';

        beforeEach(() => {
            testSubject = new CosmosKeyProvider(
                tokenProviderMock.object,
                loggerMock.object,
                retryHelperMock.object,
                gotStub,
                apiVersion,
                maxRetries,
            );
            tokenProviderMock.setup((tp) => tp.getToken()).returns(async () => token);
        });

        afterEach(() => {
            retryHelperMock.verifyAll();
            loggerMock.verifyAll();
            postMock.verifyAll();
        });

        it('successfully retrieves key', async () => {
            retryHelperMock
                .setup((rh) => rh.executeWithRetries(It.isAny(), It.isAny(), maxRetries))
                .returns(async (action, onRetry, maxRetryCount: number) => action())
                .verifiable(Times.once());
            setupRequest(getResponse(primaryKey));

            const key = await testSubject.getCosmosKey(baseUrl);

            expect(key).toBe(primaryKey);
        });

        it('Logs error on retry', async () => {
            const error = new Error('test error');
            const expectedLogMessage = 'Failed to retrieve CosmosDB key. Retrying on error.';
            const response = getResponse(primaryKey);

            retryHelperMock
                .setup((rh) => rh.executeWithRetries(It.isAny(), It.isAny(), maxRetries))
                .returns(async (action, onRetry, maxRetryCount: number) => {
                    onRetry(error);

                    return response;
                })
                .verifiable(Times.once());
            loggerMock.setup((l) => l.logError(expectedLogMessage, { error: System.serializeError(error) })).verifiable(Times.once());

            const key = await testSubject.getCosmosKey(baseUrl);

            expect(key).toBe(primaryKey);
        });

        it('Throws error if body does not contain primary key', async () => {
            const expectedLogMessage = 'Response body did not contain CosmosDB primary key.';
            const expectedError = new Error('Failed to retrieve CosmosDB primary key');
            const response = getResponse(null);

            retryHelperMock
                .setup((rh) => rh.executeWithRetries(It.isAny(), It.isAny(), maxRetries))
                .returns(async (action, onRetry, maxRetryCount: number) => action())
                .verifiable(Times.once());
            setupRequest(response);
            loggerMock.setup((l) => l.logError(expectedLogMessage, { response: JSON.stringify(response) })).verifiable(Times.once());

            try {
                await testSubject.getCosmosKey(baseUrl);
                fail('test should throw an error');
            } catch (e) {
                expect(e).toEqual(expectedError);
            }
        });

        function setupRequest(response: ResponseWithBodyType<CosmosDbKeys>): void {
            const expectedOptions = {
                headers: {
                    authorization: `Bearer ${token.token}`,
                },
            };
            postMock
                .setup((p) => p(listKeysEndpoint, expectedOptions))
                .returns(() => response)
                .verifiable(Times.once());
        }

        function getResponse(key: string | null): ResponseWithBodyType<CosmosDbKeys> {
            return {
                body: {
                    primaryMasterKey: key,
                },
            } as ResponseWithBodyType<CosmosDbKeys>;
        }
    });
});
