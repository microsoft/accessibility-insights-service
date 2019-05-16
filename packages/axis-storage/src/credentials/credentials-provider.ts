import { inject, injectable } from 'inversify';
import * as msRestAzure from 'ms-rest-azure';
import { iocTypeNames } from '../ioc-types';

export type Credentials = msRestAzure.MSIVmTokenCredentials | msRestAzure.ApplicationTokenCredentials;

@injectable()
export class CredentialsProvider {
    constructor(@inject(iocTypeNames.msRestAzure) private readonly msrestAzureObj: typeof msRestAzure) {}

    public async getCredentialsForKeyVault(): Promise<Credentials> {
        return this.getCredentialsForResource('https://vault.azure.net');
    }

    private async getCredentialsForResource(resource: string): Promise<Credentials> {
        return this.msrestAzureObj.loginWithMSI({ resource });
    }
}
