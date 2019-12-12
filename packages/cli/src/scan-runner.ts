// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { reject } from 'bluebird';
import { inject, injectable } from 'inversify';
import { AxeScanResults, Scanner } from 'scanner';
import { WebDriver } from 'service-library';
@injectable()
export class ScanRunner {
    constructor(@inject(Scanner) private readonly scanner: Scanner, @inject(WebDriver) private readonly webDriver: WebDriver) {}

    public async scan(url: string): Promise<AxeScanResults> {
        console.log(`going to scan ${url}`);
        // start new web driver process
        try {
            const browser = await this.webDriver.launch();

            return this.scanner.scan(url);
        } catch (error) {
            console.log(`Page scan run failed.`, { error });
            throw error;
        } finally {
            try {
                await this.webDriver.close();
            } catch (error) {
                console.log(`Unable to close the web driver instance.`, { error });
            }
        }
    }
}
