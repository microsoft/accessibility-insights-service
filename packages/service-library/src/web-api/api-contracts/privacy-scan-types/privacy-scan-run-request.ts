// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyScanConfiguration, StorageDocument } from 'storage-documents';
import { ReportGroup, Website } from '../scan-run-request';

export type PrivacyScanConfigDefinition = Omit<PrivacyScanConfiguration, keyof StorageDocument>;

export interface PrivacyScanRequest {
    url: string;
    privacyScanConfig: PrivacyScanConfiguration;
    priority?: number;
    reportGroups?: ReportGroup[];
    site?: Website;
}
