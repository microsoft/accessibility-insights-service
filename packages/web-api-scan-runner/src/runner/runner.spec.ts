// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-object-literal-type-assertion no-unsafe-any
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { Logger } from 'logger';
import { Browser } from 'puppeteer';
import { AxeScanResults } from 'scanner';
import { IssueScanResults, ItemType, PageScanResult, RunState, WebsitePage } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScannerTask } from '../tasks/scanner-task';
import { ScanMetadata } from '../types/scan-metadata';
import { Runner } from './runner';

describe('runner', () => {
    it('run scan workflow', async () => {
        //todo
    });
});
