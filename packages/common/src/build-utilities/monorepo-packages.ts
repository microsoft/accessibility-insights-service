// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as fs from 'fs';
import * as path from 'path';

/* eslint-disable security/detect-non-literal-fs-filename */

export function listMonorepoPackageNames(): string[] {
    const packagesDir = path.join(__dirname, '../../../');
    const packageDirNames = fs.readdirSync(packagesDir);

    return packageDirNames
        .map((dirName) => {
            const packageJsonPath = path.join(packagesDir, dirName, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                return null;
            }

            return JSON.parse(fs.readFileSync(packageJsonPath).toString()).name;
        })
        .filter((name): name is string => name != null);
}
