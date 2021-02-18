# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
[CmdletBinding()]
Param(
    [Parameter()]
    [Alias('k')]
    [string]$keyvault
)

$global:userType = ""
$global:principalName = ""
$global:azurecr = ""
$global:keyvault = $keyvault

function exitWithUsageInfo {
    Write-Output "Usage: pull-image-from-container-registry.ps1 -k <key vault name>"
    exit 1
}

function loginToAzure() {
    if ($global:userType -eq "user" ) {
        $isLogged = $(az account show) 
        if ([string]::IsNullOrEmpty($isLogged)) {
            az login
        }
    }
    else {
        az login --identity
    }
}

function getCurrentUserDetails() {
    try {
        $global:userType = $(az account show --query "user.type" -o tsv)
        $global:principalName = $(az account show --query "user.name" -o tsv)
    }
    catch {
    }
    

    if ( $global:userType -eq "user" ) {
        Write-Output "Running script using current user credentials"
    }
    else {
        Write-Output "Running script using system managed identity"
    }
}

function grantUserAccessToKeyVault() {
    if ( $global:userType -eq "user" ) {
        Write-Output "Granting access to key vault for current user account"
        az keyvault set-policy --name $global:keyVault --upn $global:principalName --secret-permissions get list
    }
}

function revokeUserAccessToKeyVault() {
    if ( $global:userType -eq "user" ) {
        Write-Output "Revoking access to key vault for current user account"
        try {
            az keyvault delete-policy --name "$global:keyVault" --upn "$global:principalName"
        }
        catch {
        }
    }
}

function getSecretValue($key) {
    $secretValue = $(az keyvault secret show --name "$key" --vault-name "$keyVault" --query "value" -o tsv)

    if ([string]::IsNullOrEmpty($secretValue )) {
        Write-Output "Unable to get secret for the $key"
        exit 1
    }

    return $secretValue
}

function loginToContainerRegistry() {
    $containerRegistryUsername = getSecretValue "containerRegistryUsername"
    $containerRegistryPassword = getSecretValue "containerRegistryPassword"
    $global:azurecr="$containerRegistryUsername.azurecr.io"

    Write-Output "Login to the container registry $azurecr..."
    echo "$containerRegistryPassword" | docker login -u "$containerRegistryUsername" --password-stdin "$azurecr"
}

function pullDockerImages() {
    Write-Output "Pulling Batch images from container registry..."
    $scanManagerImage="$azurecr/batch-scan-manager:latest"
    $scanRunnerImage="$azurecr/batch-scan-runner:latest"

    Write-Output "Pulling image $scanManagerImage"
    docker pull $scanManagerImage

    Write-Output "Pulling image $scanRunnerImage"
    docker pull $scanRunnerImage
}

if ([string]::IsNullOrEmpty($global:keyvault)) {
    $global:keyvault = $env:KEY_VAULT_NAME;
}

if ([string]::IsNullOrEmpty($global:keyvault)) {
    exitWithUsageInfo
}

try {
    getCurrentUserDetails
    loginToAzure
    grantUserAccessToKeyVault
    loginToContainerRegistry
    pullDockerImages
}
catch {
    revokeUserAccessToKeyVault
}


