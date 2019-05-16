import 'reflect-metadata';

import * as msRestAzure from 'ms-rest-azure';
import { IMock, Mock, MockBehavior } from 'typemoq';
import { CredentialsProvider } from './credentials-provider';
// tslint:disable: no-any

describe(CredentialsProvider, () => {
    let testSubject: CredentialsProvider;
    let msRestAzureMock: IMock<typeof msRestAzure>;
    // tslint:disable-next-line: mocha-no-side-effect-code
    const credentialsStub = 'test creds' as any;

    beforeEach(() => {
        msRestAzureMock = Mock.ofInstance(msRestAzure, MockBehavior.Strict);
        testSubject = new CredentialsProvider(msRestAzureMock.object);
    });

    it('gets keyvault credentails', async () => {
        msRestAzureMock
            .setup(async r => r.loginWithMSI({ resource: 'https://vault.azure.net' }))
            .returns(async () => Promise.resolve(credentialsStub));

        const actualCreds = await testSubject.getCredentialsForKeyVault();

        expect(actualCreds).toBe(credentialsStub);
        msRestAzureMock.verifyAll();
    });
});
