import { ScanTaskRunner } from './scan-task-runner';

export interface ScanConfig {
    serviceTreeId: string;
    baseUrl: string;
    name: string;
    id: string;
    scanUrl: string;
}

export class NodeEntryPoint {
    constructor(private readonly scanTaskRunner: ScanTaskRunner, private readonly nodeProcess: NodeJS.Process) {}

    public async run(): Promise<void> {
        try {
            await this.scanTaskRunner.run();
        } catch (e) {
            console.error(e);
            this.nodeProcess.exitCode = 1;
        }
    }
}
