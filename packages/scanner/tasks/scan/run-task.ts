import { TaskSteps } from './task-steps';

export interface ScanConfig {
    serviceTreeId: string;
    baseUrl: string;
    name: string;
    id: string;
    scanUrl: string;
}

export async function runTask(config: ScanConfig, taskSteps: TaskSteps, nodeProcess: NodeJS.Process): Promise<void> {
    console.log('Invoking scan for config - ', config);
    try {
        const scanResults = await taskSteps.scanForA11yIssues();
        await taskSteps.storeIssues(scanResults);
    } catch (e) {
        console.error(e);
        nodeProcess.exitCode = 1;
    }
}
