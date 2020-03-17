// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

(async () => {
    console.log('not implemented');
})().catch(error => {
    console.log('Exception thrown in send notification job manager: ', error);
    process.exit(1);
});
