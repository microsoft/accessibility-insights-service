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
    $global:azurecr = "$containerRegistryUsername.azurecr.io"

    Write-Output "Login to the container registry $azurecr..."
    Write-Output "$containerRegistryPassword" | docker login -u "$containerRegistryUsername" --password-stdin "$azurecr"
}

function pullDockerImages() {
    $pool = $env:AZ_BATCH_POOL_ID;
    Write-Output "Pulling container images from a registry for the $pool pool..."
    if ( $pool -eq "on-demand-url-scan-pool" ) {
        docker pull "$azurecr/batch-scan-manager:latest"
        docker pull "$azurecr/batch-scan-runner:latest"    
    }
    elseif ( $pool -eq "privacy-scan-pool" ) {
        docker pull "$azurecr/batch-privacy-scan-manager:latest"
        docker pull "$azurecr/batch-privacy-scan-runner:latest"    
    }
    elseif ( $pool -eq "on-demand-scan-request-pool" ) {
        docker pull "$azurecr/batch-scan-notification-manager:latest"
        docker pull "$azurecr/batch-scan-notification-runner:latest"    
        docker pull "$azurecr/batch-report-generator-manager:latest"
        docker pull "$azurecr/batch-report-generator-runner:latest"    
        docker pull "$azurecr/batch-scan-request-sender:latest"    
    }
    else {
        Write-Output "Unable to pull container images. Environment variable AZ_BATCH_POOL_ID is not defined or $pool pool is not supported."
        exit 1
    }
}

if ([string]::IsNullOrEmpty($global:keyvault)) {
    $global:keyvault = $env:KEY_VAULT_NAME;
}

if ([string]::IsNullOrEmpty($global:keyvault)) {
    exitWithUsageInfo
}

trap {
    revokeUserAccessToKeyVault
    break
}

getCurrentUserDetails
loginToAzure
grantUserAccessToKeyVault
loginToContainerRegistry
pullDockerImages
