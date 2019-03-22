import { inject } from 'inversify';
import { VError } from 'verror';
import { AxeScanResults } from './axe-scan-results';
import { Page } from './page';

export class Scanner {
    constructor(@inject(Page) private readonly page: Page) {}

    public async scan(url: string): Promise<AxeScanResults> {
        try {
            cout(`[scanner] Starting accessibility scanning of URL ${url}.`);

            await this.page.create();
            await this.page.enableBypassCSP();
            await this.page.goto(url);

            const result = await this.page.scanForA11yIssues();

            return { results: result };
        } catch (error) {
            const errorExt = new VError(<Error>error, `An error occurred while scanning website page ${url}.`);
            cout(`[scanner] ${errorExt}`);

            return { error: errorExt.message };
        } finally {
            await this.page.close();
            cout(`[scanner] Accessibility scanning of URL ${url} completed.`);
        }
    }
}
