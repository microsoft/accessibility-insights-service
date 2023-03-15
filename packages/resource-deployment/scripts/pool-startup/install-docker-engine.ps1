# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

function installDockerEngine() {
    Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force
    Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
    Install-Package -Name docker -ProviderName DockerMsftProvider -Force
    
    shutdown /r /t 0 /d p:4:2
}

Get-Process "com.docker.service" -ErrorAction SilentlyContinue 
if ($? -eq "True") {
    Write-Output ""
    docker --version
}
else {
    Write-Output "Docker service processes is not running. Installing Docker Engine..."
    installDockerEngine
}
