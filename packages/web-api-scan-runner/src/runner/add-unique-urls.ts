// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { uniq } from 'lodash';

export const addUniqueUrls = (discoveredUrls: string[], newUrls: string[]) => {
    return uniq(discoveredUrls.concat(newUrls));
};
