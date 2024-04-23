# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

param([Parameter(Mandatory = $false)][switch]$InstallHostFonts = $false) 

$shareName = "WinSxS"
$sharePathServer = "${env:windir}\WinSxS"
$sharePathClient = "${env:windir}\Fonts"
$userName = "DockerBuild"
$global:installationType = ""

function deleteShare() {
    $user = Get-LocalUser -Name $userName -ErrorAction SilentlyContinue
    if ($user) {
        net user $userName /delete /y | Out-Null
    }

    $share = Get-WmiObject -Class Win32_Share | Where-Object { $_.Name -eq $shareName }
    if ($share) {
        net share $shareName /delete /y | Out-Null
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

    if ($global:installationType -eq "Server") {
        $sharePath = $sharePathServer
    }
    else {
        $sharePath = $sharePathClient
    }

    Write-Host "Shared '$sharePath' host machine path"

    net user $userName "${env:BUILD_KEY}" /ADD | Out-Null
    net share $shareName=$sharePath /grant:"$($userName),READ" | Out-Null
}

function buildImage() {
    $images = docker images --no-trunc --format "{{json .}}"
    # Remove non-JSON string prefix
    $json = $images -match ".*(?<json>{.*)"
    $baseImages = $json | ConvertFrom-Json | Where-Object { $_.Tag -eq "prescanner" }

    if ($baseImages) {
        foreach ($baseImage in $baseImages) {
            Write-Host "Building docker image for $($baseImage.Repository)"

            $baseImageTag = "$($baseImage.Repository):$($baseImage.Tag)"
            docker tag $baseImageTag "prescanner"
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
