# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
[CmdletBinding()]
Param(
    [Parameter()]
    [Alias('k')]
    [string]$keyvault
)

$ErrorActionPreference = "Stop"

$global:keyvault = $keyvault

function exitWithUsageInfo {
    Write-Output "Usage: pool-startup.ps1 -k <key vault name>"
    exit 1
}

function installBootstrapPackages() {
    Write-Output "Installing az cli"
    Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile .\AzureCLI.msi; Start-Process msiexec.exe -Wait -ArgumentList '/I AzureCLI.msi /quiet'; rm .\AzureCLI.msi
    az version
}


if ([string]::IsNullOrEmpty($global:keyvault)) {
    $global:keyvault = $env:KEY_VAULT_NAME;
}

if ([string]::IsNullOrEmpty($global:keyvault)) {
    exitWithUsageInfo
}

installBootstrapPackages

./pull-image-from-container-registry.ps1 -k $global:keyvault

Write-Output "Invoking custom pool startup script"
./custom-pool-post-startup.ps1

Write-Output "Successfully completed pool startup script execution"
