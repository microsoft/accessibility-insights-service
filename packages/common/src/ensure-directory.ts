// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable security/detect-non-literal-fs-filename */

import * as fs from 'fs';
import _ from 'lodash';
import normalizePath from 'normalize-path';

export const ensureDirectoryImpl = (directory: string | undefined, fsObj: typeof fs, normalizePathFunc: typeof normalizePath): string => {
    let normalizedDirectory: string;
    if (_.isEmpty(directory)) {
        normalizedDirectory = normalizePathFunc(__dirname);
    } else {
        normalizedDirectory = normalizePathFunc(directory);
    }

    if (!fsObj.existsSync(normalizedDirectory)) {
        fsObj.mkdirSync(normalizedDirectory, { recursive: true });
    }

    return normalizedDirectory;
};

export const ensureDirectory = (directory?: string): string => {
    return ensureDirectoryImpl(directory, fs, normalizePath);
};
