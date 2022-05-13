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

    if (!args.crawl && !isEmpty(args.baselineFile)) {
        throw new Error('Option --baselineFile is only supported with --crawl.');
    }

    if (args.updateBaseline === true && isEmpty(args.baselineFile)) {
        throw new Error('Option --updateBaseline requires option --baselineFile.');
    }

    if (!args.crawl && (!isEmpty(args.serviceAccountName) || !isEmpty(args.serviceAccountPass))) {
        throw new Error('Options --serviceAccountName and --serviceAccountPass are only supported with --crawl.');
    }

    if (
        (isEmpty(args.serviceAccountName) && !isEmpty(args.serviceAccountPass)) ||
        (!isEmpty(args.serviceAccountName) && isEmpty(args.serviceAccountPass))
    ) {
        throw new Error('Both --serviceAccountName and --serviceAccountPass must be provided for authenticated crawling.');
    }
}
