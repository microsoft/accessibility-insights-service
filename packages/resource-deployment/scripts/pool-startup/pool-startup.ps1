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

function checkSystemVolume() {
    $drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${env:SystemDrive}'" | Select-Object Size, FreeSpace
    Write-Output "System volume ${env:SystemDrive} `
    Capacity: $(($drive.Size / 1073741824).ToString('0.00')) GB `
    Free space: $(($drive.FreeSpace / 1073741824).ToString('0.00')) GB"

    if ($($drive.FreeSpace / $drive.Size) -le 0.1 ) {
        # System volume check will reclaim hidden drive space
        Write-Output "System volume has low free space. Scheduling system volume check on the next system restart..."
        Write-Output Y | chkdsk $env:SystemDrive /R /F | Out-Null
    }
}

if ([string]::IsNullOrEmpty($global:keyvault)) {
    $global:keyvault = $env:KEY_VAULT_NAME;
}

if ([string]::IsNullOrEmpty($global:keyvault)) {
    exitWithUsageInfo
}

installBootstrapPackages

./install-docker-engine.ps1

./pull-image-from-registry.ps1 -k $global:keyvault

Write-Output "Invoking custom pool startup script"
./custom-pool-post-startup.ps1

checkSystemVolume

Write-Output "Successfully completed pool startup script execution"
