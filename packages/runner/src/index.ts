// tslint:disable: no-import-side-effect
import * as _ from 'lodash';
import { VError } from 'verror';
import { Arguments, argv } from 'yargs';
import { config } from './4env';
import './node';
import { Runner } from './runner/runner';

if (!_.isNil(config.parsed)) {
    console.log('[Runner] Emulated environment variables:');
    console.log(JSON.stringify(config.parsed, undefined, 2));
}

const request = argv as Arguments<RunnerRequest>;
cout('[Runner] Command line parameters:', request);

runnerContext.request = request; // TODO remove context

(async () => {
    const runner = new Runner();
    await runner.run(request);
})().catch((error: Error) => {
    cout(new VError(error, 'An error occurred while executing runner.'));
});
