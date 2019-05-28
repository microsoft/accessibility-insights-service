// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export class Message {
    constructor(public messageText: string, public messageId: string, public popReceipt?: string) {}
}
