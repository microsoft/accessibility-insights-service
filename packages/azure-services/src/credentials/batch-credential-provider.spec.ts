// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { IMock, Mock, Times } from 'typemoq';
import { BatchCredentialProvider } from './batch-credential-provider';

const resource = 'https://batch.core.windows.net/';

let batchCredentialProvider: BatchCredentialProvider;
let clientCredentials: msRestNodeAuth.MSIVmTokenCredentials;
let msRestNodeAuthMock: IMock<typeof msRestNodeAuth>;

describe(BatchCredentialProvider, () => {
    beforeEach(() => {
        msRestNodeAuthMock = Mock.ofInstance(msRestNodeAuth);
        clientCredentials = { clientId: 'clientId' } as msRestNodeAuth.MSIVmTokenCredentials;
        batchCredentialProvider = new BatchCredentialProvider(msRestNodeAuthMock.object);
    });

    afterEach(() => {
        msRestNodeAuthMock.verifyAll();
    });

    it('get credentials for batch service', async () => {
        msRestNodeAuthMock
            .setup((o) => o.loginWithVmMSI({ resource }))
            .returns(() => Promise.resolve(clientCredentials))
            .verifiable();
        const credential = await batchCredentialProvider.getCredential();

        expect(credential).toEqual(clientCredentials);
    });

    it('get credentials for batch service with retry', async () => {
        const times = 3;

        let count = 0;
        msRestNodeAuthMock
            .setup((o) => o.loginWithVmMSI({ resource }))
            .returns(() => {
                count++;

                return count < times ? Promise.reject(new Error()) : Promise.resolve(clientCredentials);
            })
            .verifiable(Times.exactly(times));
        const credential = await batchCredentialProvider.getCredential();

        expect(credential).toEqual(clientCredentials);
    });
});
