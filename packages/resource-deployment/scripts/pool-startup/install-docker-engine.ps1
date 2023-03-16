# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

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
        Start-Sleep -Seconds 20
        shutdown /r /d p:4:2
    }
}

function installDockerEngine() {
    Write-Output "Installing Docker Engine..."

    Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force
    Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
    Install-Package -Name docker -ProviderName DockerMsftProvider -Force

    $global:rebootRequired = $true
}

function validateDockerEngine () {
    Get-Process "dockerd" -ErrorAction SilentlyContinue
    if ($? -eq "True") {
        Write-Output "Docker is running."
        docker info
    }
    else {
        Write-Output "Docker is not running. Starting Docker service..."
        Start-Service Docker
        if ($? -eq "True") {
            Write-Output "Docker service has been started successfully."
        }
        else {
            Write-Output "Docker service failed to start."
            installDockerEngine
        }
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
