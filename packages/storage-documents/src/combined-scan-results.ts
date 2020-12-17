// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeCoreResults, UrlCount } from 'axe-result-converter';

export interface CombinedScanResults {
    urlCount: UrlCount;
    axeResults: AxeCoreResults;
}
