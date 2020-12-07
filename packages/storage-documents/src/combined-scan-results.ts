// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeCoreResults, AxeResult, UrlCount } from 'axe-result-converter';
import { SerializedHashSet } from 'common';

export type SerializedAxeResults = SerializedHashSet<AxeResult>;

export interface CombinedAxeResults extends Omit<AxeCoreResults, 'passes' | 'violations' | 'incomplete' | 'inapplicable'> {
    passes: SerializedAxeResults;
    violations: SerializedAxeResults;
    incomplete: SerializedAxeResults;
    inapplicable: SerializedAxeResults;
}

export interface CombinedScanResults {
    urlCount: UrlCount;
    axeResults: CombinedAxeResults;
}
