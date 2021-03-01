// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { System } from 'common';
import { setupHostBrowserServiceContainer } from './setup-host-browser-service-container';
import { HostBrowserServiceEntryPoint } from './host-browser-service-entry-point';

(async () => {
    await new HostBrowserServiceEntryPoint(setupHostBrowserServiceContainer()).start();
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
