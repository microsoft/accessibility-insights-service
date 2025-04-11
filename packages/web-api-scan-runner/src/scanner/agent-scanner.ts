// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanRunState } from 'storage-documents';
import { System } from 'common';
import { AxeResults } from 'axe-core';

/* eslint-disable security/detect-child-process */
/* eslint-disable security/detect-non-literal-fs-filename */

export interface AgentResults {
    result?: OnDemandPageScanRunState;
    scannedUrl?: string;
    error?: string;
    axeResults?: AxeResults;
}

@injectable()
export class AgentScanner {
    private readonly agentFolder;

    private readonly agentExePath;

    private readonly agentArtifactsPath;

    private readonly agentAxeResultPath;

    private readonly agentExeCommand;

    constructor(@inject(GlobalLogger) private readonly logger: GlobalLogger) {
        this.agentFolder = `${__dirname}/a11y_agent`;
        if (System.isDebugEnabled() === true) {
            this.agentFolder = `${__dirname}/../../../a11y_agent`;
        }
        this.agentExePath = `${this.agentFolder}/A11yAgent.Console.exe`;
        this.agentArtifactsPath = `${this.agentFolder}/output`;
        this.agentAxeResultPath = `${this.agentArtifactsPath}/axe-results.json`;
        this.agentExeCommand = `${this.agentExePath} --headless true --url`;
    }

    public async scan(url: string): Promise<AgentResults> {
        let response;

        this.logger.logInfo('Starting accessibility agent scan.');
        try {
            response = await this.executeAgent(url);
            if (response.result === 'failed') {
                return { ...response, scannedUrl: url };
            }

            response = await this.processAxeResults();
            if (response.result === 'failed') {
                return { ...response, scannedUrl: url };
            }

            return { ...response, scannedUrl: url };
        } catch (error) {
            this.logger.logError('Error while running accessibility agent scan.', { error: System.serializeError(error) });

            return {
                result: 'failed',
                scannedUrl: url,
                error: System.serializeError(error),
            };
        } finally {
            this.logger.logInfo('The accessibility agent scan is complete.');
        }
    }

    private async processAxeResults(): Promise<AgentResults> {
        if (!fs.existsSync(this.agentAxeResultPath)) {
            this.logger.logError('Agent did not produce axe results file.', { path: this.agentAxeResultPath });

            return {
                result: 'failed',
                error: 'Agent did not produce axe results file.',
            };
        }

        const axeResults = fs.readFileSync(this.agentAxeResultPath, 'utf8');

        return {
            result: 'completed',
            axeResults: JSON.parse(axeResults),
        };
    }

    private async executeAgent(url: string): Promise<AgentResults> {
        const execAsync = promisify(exec);
        const timeoutMsec: number = 120000;

        try {
            const { stdout, stderr } = await execAsync(`${this.agentExeCommand} ${encodeURI(url)}`, {
                timeout: timeoutMsec,
                cwd: this.agentFolder,
                env: { ...process.env, VSCODE_INSPECTOR_OPTIONS: '' }, // Disable VSCode inspector to prevent dotnet debugger attachment
            });

            if (stderr) {
                this.logger.logError('Agent exited with error code.', { error: stderr });

                return {
                    result: 'failed',
                    error: stderr,
                };
            }

            this.logger.logInfo('Agent console output.', { stdout });

            return {
                result: 'completed',
            };
        } catch (error) {
            let message;
            if (error.killed) {
                message = 'Agent process was terminated due to timeout.';
                this.logger.logError(message, { timeout: timeoutMsec.toString() });
            } else {
                message = `Error while executing agent. ${System.serializeError(error)}`;
                this.logger.logError('Error while executing agent.', { error: System.serializeError(error) });
            }

            return {
                result: 'failed',
                error: message,
            };
        }
    }
}
