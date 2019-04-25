import { JobManagerEntryPoint } from './job-manager-entry-point';
import { setupJobManagerContainer } from './setup-job-manager-container';

(async () => {
    const jobManagerEntryPoint = new JobManagerEntryPoint(setupJobManagerContainer);
    await jobManagerEntryPoint.start();
})().catch(() => {
    process.exit(1);
});
