// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyScanConfiguration } from 'service-library';
import { ItemType } from '..';
import { StorageDocument } from '../storage-document';

export type PrivacyScanConfigurationDocument = PrivacyScanConfiguration &
    StorageDocument & {
        itemType: ItemType.privacyScanConfiguration;
    };
