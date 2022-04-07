// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This is a temporary workaround to fix a missing type definition for
// fingerprint-generator, which is a transitive dependency through
// Apify. The release of fingerprint-generator v2 will include its own
// typings, so this package can be removed once Apify updates its
// dependency.
declare module 'fingerprint-generator' {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class FingerprintGenerator {}

    export = FingerprintGenerator;
}
