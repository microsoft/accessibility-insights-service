// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import axe from 'axe-core';

export declare type SelectorType = 'xpath' | 'css';

export interface AxeCoreResults extends axe.AxeResults {
    urls: string[];
    passes: AxeResult[];
    violations: AxeResult[];
    incomplete: AxeResult[];
    inapplicable: AxeResult[];
}

export interface AxeResult extends axe.Result {
    urls: string[];
    nodes: AxeNodeResult[];
}

export interface AxeNodeResult extends axe.NodeResult {
    selectors: Selector[];
    fingerprint: string;
}

export interface Selector {
    selector: string;
    type: SelectorType;
}
