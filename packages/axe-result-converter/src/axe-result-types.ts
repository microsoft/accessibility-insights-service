// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { UrlInfo } from 'accessibility-insights-report';
import axe from 'axe-core';
import { HashSet } from 'common';

export declare type SelectorType = 'xpath' | 'css';

export interface AxeCoreResults extends Omit<axe.AxeResults, 'passes' | 'violations' | 'incomplete' | 'inapplicable'> {
    urls: string[];
    passes: AxeResultsList;
    violations: AxeResultsList;
    incomplete: AxeResultsList;
    inapplicable: AxeResultsList;
}

export class AxeResultsList extends HashSet<AxeResult> {}

export interface AxeResult extends axe.Result {
    urls: string[];
    urlInfos: UrlInfo[];
    junctionNode?: AxeNodeResult;
    fingerprint: string;
}

export interface AxeNodeResult extends axe.NodeResult {
    selectors: Selector[];
}

export interface Selector {
    selector: string;
    type: SelectorType;
}
