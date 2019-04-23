// tslint:disable: no-import-side-effect
import { setupRunnerContainer } from './setup-runner-container';

import { VError } from 'verror';
import { Arguments, argv, demandOption } from 'yargs';
import { config } from './4env';
import './node';
import { Runner } from './runner/runner';
import { ScanMetadata } from './types/scan-metadata';

if (config.parsed !== undefined) {
    console.log('[Runner] Config based environment variables:');
    console.log(JSON.stringify(config.parsed, undefined, 2));
}

demandOption(['websiteId', 'websiteName', 'baseUrl', 'scanUrl', 'serviceTreeId']);
const scanMetadata = argv as Arguments<ScanMetadata>;
cout('[Runner] Scan parameters:', scanMetadata);

(async () => {
    const container = setupRunnerContainer();
    const runner = container.get<Runner>(Runner);
    await runner.run(scanMetadata);
})().catch(error => {
    cout(new VError(cause(error), 'An error occurred while executing runner.'));
    process.exit(1);
});
