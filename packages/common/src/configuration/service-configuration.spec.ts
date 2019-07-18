// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as convict from 'convict';
import * as fs from 'fs';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { RuntimeConfig, ServiceConfiguration } from './service-configuration';

// tslint:disable: non-literal-fs-path no-unsafe-any no-any

describe(ServiceConfiguration, () => {
    let testSubject: ServiceConfiguration;
    let fsMock: IMock<typeof fs>;
    let convictMock: IMock<typeof convict>;
    let configMock: IMock<convict.Config<RuntimeConfig>>;
    let actualSchema: convict.Schema<RuntimeConfig>;

    beforeEach(() => {
        convictMock = Mock.ofInstance(convict);

        configMock = Mock.ofType<convict.Config<RuntimeConfig>>();
        getPromisableDynamicMock(configMock);

        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        testSubject = new ServiceConfiguration(fsMock.object, convictMock.object);
    });

    it('verifies dev config', async () => {
        setupVerifiableFileExistsCall(ServiceConfiguration.profilePath, false);
        const keyToFetch = 'logConfig';
        const expectedConfigValue = 'config value';

        setupVerifiableSchemaSetupCall();
        setupLoadCustomFileConfigCallsNotCalled();
        configMock.setup(c => c.get(keyToFetch)).returns(() => expectedConfigValue as any);

        const actualConfigValue = await testSubject.getConfigValue(keyToFetch);

        expect(actualConfigValue).toBe(expectedConfigValue);
        expect(actualSchema).toMatchSnapshot();

        verifyMocks();
    });

    it('loads config only once', async () => {
        setupVerifiableFileExistsCall(ServiceConfiguration.profilePath, false);
        const keyToFetch = 'logConfig';
        const expectedConfigValue = 'config value';

        setupVerifiableSchemaSetupCall();
        configMock.setup(c => c.get(keyToFetch)).returns(() => expectedConfigValue as any);

        let actualConfigValue = await testSubject.getConfigValue(keyToFetch);
        expect(actualConfigValue).toBe(expectedConfigValue);

        actualConfigValue = await testSubject.getConfigValue(keyToFetch);
        expect(actualConfigValue).toBe(expectedConfigValue);

        verifyMocks();
    });

    it('verifies custom config', async () => {
        setupVerifiableFileExistsCall(ServiceConfiguration.profilePath, true);
        const keyToFetch = 'logConfig';
        const expectedConfigValue = 'config value';

        setupVerifiableSchemaSetupCall();
        setupVerifiableLoadCustomFileConfigCalls();

        configMock.setup(c => c.get(keyToFetch)).returns(() => expectedConfigValue as any);

        const actualConfigValue = await testSubject.getConfigValue(keyToFetch);

        expect(actualConfigValue).toBe(expectedConfigValue);
        expect(actualSchema).toMatchSnapshot();

        verifyMocks();
    });

    it('throws on custom config validation failure', async () => {
        setupVerifiableFileExistsCall(ServiceConfiguration.profilePath, true);
        const keyToFetch = 'logConfig';
        const expectedError = 'validation failed';

        setupVerifiableSchemaSetupCall();
        setupVerifiableCustomConfigLoadCall();
        configMock
            .setup(c => c.validate(It.isValue({ allowed: 'strict' })))
            .returns(() => {
                throw expectedError;
            });

        await expect(testSubject.getConfigValue(keyToFetch)).rejects.toBe(expectedError);

        verifyMocks();
    });

    function verifyMocks(): void {
        configMock.verifyAll();
        convictMock.verifyAll();
        fsMock.verifyAll();
    }

    function setupVerifiableLoadCustomFileConfigCalls(): void {
        setupVerifiableCustomConfigLoadCall();
        configMock.setup(c => c.validate(It.isValue({ allowed: 'strict' }))).verifiable(Times.once());
    }

    function setupVerifiableCustomConfigLoadCall(): void {
        configMock.setup(c => c.loadFile(ServiceConfiguration.profilePath)).verifiable(Times.once());
    }
    function setupLoadCustomFileConfigCallsNotCalled(): void {
        configMock.setup(c => c.loadFile(It.isAny())).verifiable(Times.never());
        configMock.setup(c => c.validate(It.isAny())).verifiable(Times.never());
    }

    function setupVerifiableSchemaSetupCall(): void {
        convictMock
            .setup(c => c<RuntimeConfig>(It.isAny()))
            .callback((s: convict.Schema<RuntimeConfig>) => {
                actualSchema = s;
            })
            .returns(() => configMock.object)
            .verifiable(Times.once());
    }
    function setupVerifiableFileExistsCall(profilePath: string, fileExistsValue: boolean): void {
        fsMock
            .setup(f => f.exists(profilePath, It.isAny()))
            .callback((filePath: string, cb: (exists: boolean) => void) => {
                cb(fileExistsValue);
            })
            .verifiable(Times.once());
    }
});
