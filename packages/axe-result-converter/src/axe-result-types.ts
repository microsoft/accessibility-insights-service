// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import axe from 'axe-core';

export declare type SelectorType = 'xpath' | 'css';

export interface AxeCoreResults extends axe.AxeResults {
    passes: AxeResult[];
    violations: AxeResult[];
    incomplete: AxeResult[];
}

export interface AxeResult extends axe.Result {
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
