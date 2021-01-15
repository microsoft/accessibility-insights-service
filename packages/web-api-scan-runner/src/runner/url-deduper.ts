// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { uniq } from 'lodash';

@injectable
export class UrlDeduper {
    public dedupe: (discoveredUrls: string[], newUrls: string[]) => string[] = (discoveredUrls, newUrls) => {
        return uniq(discoveredUrls.concat(newUrls));
    };
}
