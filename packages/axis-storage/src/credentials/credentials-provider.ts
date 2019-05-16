import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { inject, injectable } from 'inversify';
import { iocTypeNames } from '../ioc-types';

export type Credentials = msRestNodeAuth.MSIVmTokenCredentials | msRestNodeAuth.ApplicationTokenCredentials;

@injectable()
export class CredentialsProvider {
    constructor(@inject(iocTypeNames.msRestAzure) private readonly msrestAzureObj: typeof msRestNodeAuth) {}

    public async getCredentialsForKeyVault(): Promise<Credentials> {
        // referred https://azure.microsoft.com/en-us/resources/samples/app-service-msi-keyvault-node/
        return this.getCredentialsForResource('https://vault.azure.net');
    }

    private async getCredentialsForResource(resource: string): Promise<Credentials> {
        return this.msrestAzureObj.loginWithVmMSI({ resource });
    }
}
