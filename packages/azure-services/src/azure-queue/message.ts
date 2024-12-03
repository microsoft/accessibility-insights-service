// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, optional } from 'inversify';

export class Message {
    constructor(@optional() @inject('string') public messageText: string, public messageId: string, public popReceipt?: string) {}
}
