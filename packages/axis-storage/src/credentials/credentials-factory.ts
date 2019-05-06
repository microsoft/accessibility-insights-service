import { injectable } from 'inversify';
import * as msrest from 'ms-rest-azure';

@injectable()
export class CredentialsFactory {
    public async getCredentials(): Promise<msrest.MSIAppServiceTokenCredentials> {
        return msrest.loginWithMSI();
    }
}
