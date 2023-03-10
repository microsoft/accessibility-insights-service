# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

function installDocker() {
    Write-Output "Installing WSL..."
    wsl --install --no-distribution

    Write-Output "Downloading Docker installer..."
    Start-BitsTransfer -Source https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe -Destination "D:\Docker Desktop Installer.exe"

    Write-Output "Running Docker installer..."
    Start-Process "D:\Docker Desktop Installer.exe" -Wait -NoNewWindow "install --quiet --accept-license"

    Write-Output "Docker Desktop successfully installed. Rebooting machine..."
    shutdown /r /t 0 /d p:4:2
}

Get-Process "com.docker.service" -ErrorAction SilentlyContinue 
if ($? -eq "True") {
    Write-Output
    docker --version
}
else {
    Write-Output "Docker service processes is not running. Installing Docker..."
    installDocker
}
