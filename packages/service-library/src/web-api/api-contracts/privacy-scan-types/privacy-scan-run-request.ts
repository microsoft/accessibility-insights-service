// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ReportGroup, Website } from '../scan-run-request';
import { PrivacyScanConfiguration } from './privacy-scan-configuration';

export interface PrivacyScanRequest {
    url: string;
    privacyScanConfig: PrivacyScanConfiguration;
    priority?: number;
    reportGroups?: ReportGroup[];
    site?: Website;
}
