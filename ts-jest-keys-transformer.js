// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const keysTransformer = require('ts-transformer-keys/transformer').default;
const name = 'my-key-transformer';
const version = 1;
const factory = (cs) => (ctx) => keysTransformer(cs.program)(ctx);

module.exports = { name, version, factory };
