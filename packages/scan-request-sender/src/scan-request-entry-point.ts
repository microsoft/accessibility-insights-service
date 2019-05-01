import { Container } from 'inversify';
import { BaseEntryPoint, BaseTelemetryProperties, Logger } from 'logger';
import { WebSite } from './request-type/website';
import { ScanRequestSender } from './sender/request-sender';
import { SeedSource } from './source/seed-source';

export class ScanRequestEntryPoint extends BaseEntryPoint {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'scanRequestSender' };
    }
    protected async runCustomAction(container: Container): Promise<void> {
        const source = container.get(SeedSource);
        const logger = container.get(Logger);
        const sender: ScanRequestSender = container.get(ScanRequestSender);

        const websitesToScan: WebSite[] = await source.getWebSites();
        await sender.sendRequestToScan(websitesToScan);

        logger.logInfo(`[Sender] sent scan requests for ${websitesToScan.length} websites`);
    }
}
