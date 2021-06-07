// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import { ScanArguments } from './scan-arguments';

export function validateScanArguments(args: ScanArguments): void {
    if (args.crawl && isEmpty(args.url)) {
        throw new Error('The --url option is required for website crawling.');
    }

    if (isEmpty(args.url) && isEmpty(args.inputFile) && isEmpty(args.inputUrls)) {
        throw new Error('Provide at least --url, --inputFile, or  --inputUrls option.');
    }

    if (args.restart === true && args.continue === true) {
        throw new Error('Options --restart and --continue are mutually exclusive.');
    }
}
