// tslint:disable: no-import-side-effect
import { container } from './inversify.config';

import { VError } from 'verror';
import { Arguments, argv, demandOption } from 'yargs';
import { config } from './4env';
import { ScanMetadata } from './common/scan-metadata';
import './node';
import { Runner } from './runner/runner';

if (config.parsed !== undefined) {
    console.log('[Runner] Config based environment variables:');
    console.log(JSON.stringify(config.parsed, undefined, 2));
}

demandOption(['websiteId', 'websiteName', 'baseUrl', 'scanUrl', 'serviceTreeId']);
const scanMetadata = argv as Arguments<ScanMetadata>;
cout('[Runner] Scan parameters:', scanMetadata);

(async () => {
    const runner = container.get<Runner>(Runner);
    await runner.run(scanMetadata);
})().catch((error: Error) => {
    cout(new VError(error, 'An error occurred while executing runner.'));
    process.exit(1);
});
