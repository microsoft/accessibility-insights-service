// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// import { System } from 'common';
import { Container } from 'inversify';
import { BaseTelemetryProperties, ContextAwareLogger } from 'logger';
import { Scanner } from 'scanner';
import { ProcessEntryPointBase } from 'service-library';
import { Runner } from './runner/runner';

export class WebApiScanRunnerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'webApiScanRunner' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const logger = container.get(ContextAwareLogger);
        await logger.setup();

        const scanner = container.get<Scanner>(Scanner);
        // const result = await scanner.scan('https://www.microsoft.com/en-us/');
        const result = await scanner.scan('https://opensource.microsoft.com/');
        // console.log(System.serializeError(result.results.violations));

        // result.results.violations.map((v) => {
        //     v.nodes.map((n) => {
        //         n.any.map((i) => {
        //             console.log(`${i.id}`);
        //         });
        //     });
        // });

        console.log(
            `Violations count ${result.results.violations[0]?.nodes !== undefined ? result.results.violations[0].nodes.length : 0}`,
        );

        const runner = container.get<Runner>(Runner);
        await runner.run();
    }
}
