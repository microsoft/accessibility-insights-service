// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanReport, OnDemandPageScanRunState } from 'storage-documents';
import { System } from 'common';
import { AxeResults } from 'axe-core';
import { isEmpty } from 'lodash';
import { ReportWriter } from 'service-library';
import { AgentReportGenerator } from '../agent/agent-report-generator';

/* eslint-disable security/detect-child-process */
/* eslint-disable security/detect-non-literal-fs-filename */

export interface AgentResults {
    result?: OnDemandPageScanRunState;
    scannedUrl?: string;
    error?: string;
    axeResults?: AxeResults;
    reportRefs?: OnDemandPageScanReport[];
}

@injectable()
export class AgentScanner {
    private readonly agentFolder;

    private readonly agentExePath;

    private readonly agentArtifactsPath;

    private readonly agentAxeResultPath;

    private readonly agentExeCommand;

    constructor(
        @inject(AgentReportGenerator) private readonly agentReportGenerator: AgentReportGenerator,
        @inject(ReportWriter) protected readonly reportWriter: ReportWriter,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {
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

            const reportRefs = await this.generateScanReports(response);
            if (reportRefs.length === 0) {
                this.logger.logError('No reports were generated from accessibility agent scan.', { scannedUrl: url });

                return {
                    result: 'failed',
                    scannedUrl: url,
                    error: 'No reports were generated from accessibility agent scan.',
                };
            }

            return { ...response, scannedUrl: url, reportRefs };
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

    private async generateScanReports(agentResults: AgentResults): Promise<OnDemandPageScanReport[]> {
        this.logger.logInfo(`Generating reports from accessibility agent scan results.`);
        const reports = this.agentReportGenerator.generateReports(agentResults);
        const availableReports = reports.filter((r) => !isEmpty(r.content));

        return this.reportWriter.writeBatch(availableReports);
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
            const { stdout, stderr } = await execAsync(`start cmd /C "${this.agentExeCommand} ${encodeURI(url)}"`, {
                timeout: timeoutMsec,
                cwd: this.agentFolder,
                env: { ...process.env, VSCODE_INSPECTOR_OPTIONS: '' }, // Disable VSCode inspector to prevent dotnet debugger attachment
                windowsHide: false,
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
            if (error.killed) {
                this.logger.logError('Agent process was terminated due to timeout.', { timeout: timeoutMsec.toString() });
            } else {
                this.logger.logError('Error while executing agent.', { error: System.serializeError(error) });
            }

            return {
                result: 'failed',
                error: System.serializeError(error),
            };
        }
    }
}
