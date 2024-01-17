# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

$shareName = "WinSxS"
$sharePath = "${env:windir}\WinSxS"
$userName = "DockerBuild"

function deleteShare() {
    $user = Get-LocalUser -Name $userName -ErrorAction SilentlyContinue
    if ($user) {
        net user $userName /delete | Out-Null
    }

    $share = Get-WmiObject -Class Win32_Share | Where-Object { $_.Name -eq $shareName }
    if ($share) {
        net share $shareName /delete | Out-Null
    }
}

function createShare() {
    Add-Type -AssemblyName System.Web
    $env:BUILD_KEY = [System.Web.Security.Membership]::GeneratePassword(14, 1).Replace('/', '#')

    net user $userName "${env:BUILD_KEY}" /ADD | Out-Null
    net share $shareName=$sharePath /grant:"$($userName),READ" | Out-Null
}

function buildImage() {
    $baseImages = docker images --no-trunc --format "{{json .}}" | ConvertFrom-Json | Where-Object { $_.Tag -eq "prescanner" }
    if ($baseImages) {
        foreach ($baseImage in $baseImages) {
            Write-Output "Building docker image for $($baseImage.Repository)"

            $baseImageTag = "$($baseImage.Repository):$($baseImage.Tag)"
            docker tag $baseImageTag "prescanner"
            docker build --file Dockerfile.scanner --tag $baseImage.Repository --build-arg BUILD_KEY="$env:BUILD_KEY" .
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
