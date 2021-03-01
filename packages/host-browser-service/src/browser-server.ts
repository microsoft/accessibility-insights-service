// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger, Logger } from 'logger';

@injectable()
export class BrowserServer {
    constructor(@inject(GlobalLogger) @optional() private readonly logger: Logger) {}

    public run(): void {
        this.logger.logInfo(`BrowserServer.run() called`);
    }
}
