// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export const iocTypes = {
    AzureAuthClientCredentialProvider: 'azureAuthClientCredentialProvider',
    SecretVaultProvider: 'secretVaultProvider',
};

export interface SecretVault {
    [key: string]: string;
}
