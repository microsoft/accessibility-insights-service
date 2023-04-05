// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeOs from 'os';
import * as fs from 'fs';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';

/* eslint-disable security/detect-non-literal-fs-filename */

export interface Manifest {
    name: string;
    browser_action: {
        default_popup: string;
    };
}

export interface Extension {
    name: string;
    id: string;
    path: string;
}

@injectable()
export class ExtensionLoader {
    private separator: string;

    constructor(private readonly os: typeof nodeOs = nodeOs, private readonly filesystem: typeof fs = fs) {}

    public getExtension(extensionName: string, extensionId: string): Extension {
        this.separator = process.platform === 'win32' ? '\\' : '/';
        const extension = this.findExtension(extensionName, extensionId);

        return extension;
    }

    private getManifest(path: string): Manifest {
        const content = this.filesystem.readFileSync(path, { encoding: 'utf8' });

        return (isEmpty(content) ? {} : JSON.parse(content)) as Manifest;
    }

    private getManifestFile(path: string, validator: (manifest: Manifest, path: string) => boolean): { manifest: Manifest; path: string } {
        const entries = this.filesystem.readdirSync(path, { withFileTypes: true });
        const files = entries.filter((file) => !file.isDirectory() && file.name === 'manifest.json');
        const folders = entries.filter((folder) => folder.isDirectory());
        for (const file of files) {
            const manifest = this.getManifest(`${path}${this.separator}${file.name}`);
            if (validator(manifest, path)) {
                return { manifest, path };
            }
        }

        for (const folder of folders) {
            const manifest = this.getManifestFile(`${path}${this.separator}${folder.name}`, validator);
            if (manifest) {
                return manifest;
            }
        }

        return undefined;
    }

    private findExtension(extensionName: string, extensionId: string): Extension {
        if (['win32', 'darwin'].includes(process.platform) === false) {
            throw new Error(`Unsupported operating system platform: ${process.platform}`);
        }

        const userId = this.os.userInfo().username;
        const extensionFolderMac = `/Users/${userId}/Library/Application Support/Google/Chrome/Default/Extensions`;
        const extensionFolderWin = `C:\\Users\\${userId}\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions`;
        const extensionFolder = process.platform === 'win32' ? extensionFolderWin : extensionFolderMac;
        const manifestFile = this.getManifestFile(extensionFolder, (manifest, path) => {
            return (extensionName && manifest.name === extensionName) || (extensionId && this.getExtensionId(path) === extensionId);
        });

        if (manifestFile === undefined) {
            throw new Error('Chrome extension not found.');
        }

        const id = extensionId ?? this.getExtensionId(manifestFile.path);

        return { name: extensionName ?? manifestFile.manifest.name, id, path: manifestFile.path };
    }

    private getExtensionId(path: string): string {
        if (path) {
            const part = path.split(`${this.separator}Extensions${this.separator}`);
            if (part.length > 1) {
                return part[1].split(this.separator)[0];
            }
        }

        return undefined;
    }
}
