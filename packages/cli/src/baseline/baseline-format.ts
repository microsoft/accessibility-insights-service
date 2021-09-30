// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type BaselineResult = {
    rule: string;
    cssSelector: string;
    xpathSelector?: string;
    htmlSnippet: string;

    // Invariant: must be sorted
    urls: string[];
};

export type BaselineFileContent = {
    metadata: { fileFormatVersion: '1' };

    // Invariant: must be sorted by ['rule', 'cssSelector', 'xpathSelector', 'htmlSnippet']
    results: BaselineResult[];
};
