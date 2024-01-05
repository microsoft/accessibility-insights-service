// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeUrl from 'url';
import { isEmpty } from 'lodash';
import { injectable } from 'inversify';

const excludedResourceTypes = [
    '.png',
    '.jpg',
    '.zip',
    '.pdf',
    '.svg',
    '.ai',
    '.gif',
    '.tiff',
    '.bmp',
    '.heif',
    '.eps',
    '.psd',
    '.xcf',
    '.indd',
    '.rar',
    '.sitx',
    '.gz',
    '.arj',
    '.tar',
    '.tgz',
    '.hex',
];

@injectable()
export class UrlLocationValidator {
    public allowed(url: string): boolean {
        return !isEmpty(url) && !excludedResourceTypes.includes(this.getResourceType(url));
    }

    private getResourceType(url: string): string {
        const urlObj = nodeUrl.parse(url);
        if (isEmpty(urlObj.pathname)) {
            return '';
        }

        const lastSegment = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1);

        return lastSegment.lastIndexOf('.') > -1 ? lastSegment.substring(lastSegment.lastIndexOf('.')) : '';
    }
}
