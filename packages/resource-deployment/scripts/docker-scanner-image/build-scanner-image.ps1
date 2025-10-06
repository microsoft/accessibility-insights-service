# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

param([Parameter(Mandatory = $false)][switch]$InstallHostFonts = $false) 

$shareNameWin = "WinSxS"
$sharePathWin = "${env:windir}\WinSxS"
$shareNameFonts = "Fonts"
$sharePathFonts = "${env:windir}\Fonts"
$userName = "DockerBuild"
$global:installationType = ""

function deleteShare() {
    $user = Get-LocalUser -Name $userName -ErrorAction SilentlyContinue
    if ($user) {
        net user $userName /delete /y | Out-Null
    }

    $share = Get-WmiObject -Class Win32_Share | Where-Object { $_.Name -eq $shareNameWin }
    if ($share) {
        net share $shareNameWin /delete /y | Out-Null
    }
    $share = Get-WmiObject -Class Win32_Share | Where-Object { $_.Name -eq $shareNameFonts }
    if ($share) {
        net share $shareNameFonts /delete /y | Out-Null
    }
}

function createShare() {
    Add-Type -AssemblyName System.Web
    $env:BUILD_KEY = [System.Web.Security.Membership]::GeneratePassword(14, 1).Replace('/', '#')

    if (!$InstallHostFonts) {
        $global:installationType = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").InstallationType
    }
    else {
        $global:installationType = "Client"
    }
    
    Write-Host "Detected '$global:installationType' host machine type"

    net user $userName "${env:BUILD_KEY}" /ADD | Out-Null
    net share $shareNameWin=$sharePathWin /grant:"$($userName),READ" | Out-Null
    net share $shareNameFonts=$sharePathFonts /grant:"$($userName),READ" | Out-Null
}

function buildImage() {
    $images = docker images --no-trunc --format "{{json .}}"
    # Remove non-JSON string prefix
    $json = $images -match ".*(?<json>{.*)"

    try {
        $baseImages = $json | ConvertFrom-Json | Where-Object { $_.Tag -eq "prescanner" }
    }
    catch {
        Write-Host "No docker images found or unable to parse docker images. Docker images output:"
        Write-Host ($json | Format-List | Out-String)

        return
    }

    if ($baseImages) {
        foreach ($baseImage in $baseImages) {
            Write-Host "Building docker image for $($baseImage.Repository)"

            $baseImageTag = "$($baseImage.Repository):$($baseImage.Tag)"
            docker tag $baseImageTag "mcr.microsoft.com/windows/prescanner"
            docker build --file Dockerfile.scanner --tag $baseImage.Repository --build-arg BUILD_KEY="$env:BUILD_KEY" --build-arg INSTALLATION_TYPE="$global:installationType" .
        }
    }
}

trap {
    deleteShare
    break
}

deleteShare
createShare
buildImage
deleteShare
