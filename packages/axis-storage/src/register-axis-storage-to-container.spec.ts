import 'reflect-metadata';

import * as azureCosmos from '@azure/cosmos';
import * as azureStorage from 'azure-storage';
import { Container } from 'inversify';
import * as _ from 'lodash';
import { registerLoggerToContainer } from 'logger';
import * as prettyFormat from 'pretty-format';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { Activator } from './common/activator';
import { HashGenerator } from './common/hash-generator';
import { SecretProvider } from './keyvault/secret-provider';
import { registerAxisStorageToContainer } from './register-axis-storage-to-container';

// tslint:disable: no-any no-unsafe-any

describe(registerAxisStorageToContainer, () => {
    let container: Container;
    const dbUrl = 'test-cosmos-db-url';
    const dbKey = 'test-cosmos-db-key';
    const storageAccount = 'test-storage-account';
    // tslint:disable-next-line: mocha-no-side-effect-code
    const storageAccessKey = btoa('test-access-key');

    beforeEach(() => {
        container = new Container();
        registerLoggerToContainer(container);

        process.env.AZURE_STORAGE_ACCOUNT = storageAccount;
        process.env.AZURE_STORAGE_ACCESS_KEY = storageAccessKey;
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';
        process.env.AZURE_COSMOS_DB_URL = dbUrl;
        process.env.AZURE_COSMOS_DB_KEY = dbKey;
    });

    it('verify singleton resolution', () => {
        registerAxisStorageToContainer(container);

        verifySingletonDependencyResolution(HashGenerator);
        verifySingletonDependencyResolution(Activator);
        verifySingletonDependencyResolution(StorageConfig);
    });

    it('verify non-singleton resolution', () => {
        registerAxisStorageToContainer(container);

        verifyNonSingletonDependencyResolution(Queue);
        verifyNonSingletonDependencyResolution(CosmosClientWrapper);
        verifyNonSingletonDependencyResolution(SecretProvider);
    });

    it('verify Azure QueueService resolution', () => {
        registerAxisStorageToContainer(container);

        verifyNonSingletonDependencyResolution(azureStorage.QueueService);

        const queueService = container.get(azureStorage.QueueService);

        const jsonString = prettyFormat(queueService);
        expect(jsonString.indexOf(storageAccount) > 0).toBe(true);
        expect(jsonString.indexOf(storageAccessKey) > 0).toBe(true);
    });

    it('verify Azure CosmosClient resolution', () => {
        registerAxisStorageToContainer(container);

        verifyNonSingletonDependencyResolution(azureCosmos.CosmosClient);

        const cosmosClient = container.get(azureCosmos.CosmosClient);

        const jsonString = prettyFormat(cosmosClient);

        expect(jsonString.indexOf(dbKey) > 0).toBe(true);
        expect(jsonString.indexOf(dbUrl) > 0).toBe(true);
    });

    function verifySingletonDependencyResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).toBe(container.get(key));
    }

    function verifyNonSingletonDependencyResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).not.toBe(container.get(key));
    }
});
