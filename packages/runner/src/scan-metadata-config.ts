import { inject, injectable } from 'inversify';
import { loggerTypes } from 'logger';
import { Arguments, Argv } from 'yargs';
import { ScanMetadata } from './types/scan-metadata';

@injectable()
export class ScanMetadataConfig {
    constructor(@inject(loggerTypes.Argv) private readonly argvObj: Argv) {}

    public getConfig(): ScanMetadata {
        this.argvObj.demandOption(['websiteId', 'websiteName', 'baseUrl', 'scanUrl', 'serviceTreeId']);

        return this.argvObj.argv as Arguments<ScanMetadata>;
    }
}
