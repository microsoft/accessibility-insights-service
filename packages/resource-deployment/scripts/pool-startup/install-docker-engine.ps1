# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

$ErrorActionPreference = "Stop"

$global:rebootRequired = $false

function startTranscript() {
    $transcriptFileName = "vm-docker-install.log"

    $nodeRootDir = $env:AZ_BATCH_NODE_ROOT_DIR
    if ($nodeRootDir) {
        $transcriptPath = "$nodeRootDir\$transcriptFileName"
    }
    else {
        $transcriptPath = "$env:TEMP\$transcriptFileName"
    }

    Start-Transcript -Path $transcriptPath -Append -NoClobber
}

function rebootIfRequired() {
    if ($global:rebootRequired -eq $true) {
        shutdown /r /t 0 /d p:4:2
    }
}

function installDockerEngine() {
    Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force
    Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
    Install-Package -Name docker -ProviderName DockerMsftProvider -Force
    Start-Service Docker

    $global:rebootRequired = $true
}

function validateDockerEngine () {
    Write-Output "Checking Docker Engine daemon..."

    Get-Process "dockerd" -ErrorAction SilentlyContinue
    if ($? -eq "True") {
        Write-Output "Docker Engine daemon is up and running."
        docker info
    }
    else {
        Write-Output "Docker Engine daemon is not running. Installing Docker Engine..."
        installDockerEngine
    }
}

trap {
    Stop-Transcript
    break
}

startTranscript
validateDockerEngine
Stop-Transcript
rebootIfRequired
