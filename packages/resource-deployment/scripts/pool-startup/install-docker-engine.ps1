# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

$global:rebootRequired = $false

function startTranscript() {
    $transcriptFileName = "docker-install.log"
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

    $scriptName = "$env:TEMP\install-docker-ce.ps1"
    Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/microsoft/Windows-Containers/Main/helpful_tools/Install-DockerCE/install-docker-ce.ps1" -o $scriptName
    Invoke-Expression $scriptName

    $global:rebootRequired = $true
}

function validateDockerEngine () {
    Get-Process "dockerd" -ErrorAction SilentlyContinue
    if ($? -eq "True") {
        Write-Output "Docker is running."
        docker info
    }
    else {
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
