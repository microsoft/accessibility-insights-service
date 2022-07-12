// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyPageScanReport } from 'storage-documents';

export type PrivacyResults = Omit<PrivacyPageScanReport, 'httpStatusCode' | 'seedUri'>;
