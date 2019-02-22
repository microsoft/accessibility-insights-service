import { ScanTaskSteps } from './scan-task-steps';

export interface ScanConfig {
    serviceTreeId: string;
    baseUrl: string;
    name: string;
    id: string;
    scanUrl: string;
}

export class ScanTaskRunner {
    constructor(private readonly config: ScanConfig, private readonly taskSteps: ScanTaskSteps) {}

    public async run(): Promise<void> {
        console.log('Invoking scan for config - ', this.config);
        const scanResults = await this.taskSteps.scanForA11yIssues();
        await this.taskSteps.storeIssues(scanResults);
    }
}
