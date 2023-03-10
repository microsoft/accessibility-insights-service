# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

function instllDocker() {
    Write-Output "Installing WSL..."
    wsl --install --no-distribution

    Write-Output "Downloading Docker installer..."
    Start-BitsTransfer -Source https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe -Destination "D:\Docker Desktop Installer.exe"

    Write-Output "Running Docker installer..."
    Start-Process "D:\Docker Desktop Installer.exe" -Wait -NoNewWindow "install --quiet --accept-license"

    Write-Output "Docker Desktop successfully installed. Rebooting VM..."

    shutdown /r /t 0 /d p:4:2
}

Get-Process "com.docker.service"
if ($? -eq "True") {
    Write-Host
    docker --version
}
else {
    Write-Host "Docker service is not running. Installing Docker service..."
    instllDocker
}
