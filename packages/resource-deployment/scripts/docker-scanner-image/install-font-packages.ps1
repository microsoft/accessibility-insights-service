# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

Import-Module DISM

$gateway = (Get-NetRoute '0.0.0.0/0').NextHop
net use W: \\$gateway\WinSxS /user:DockerBuild "${env:BUILD_KEY}" | Out-Null
net use F: \\$gateway\Fonts /user:DockerBuild "${env:BUILD_KEY}" | Out-Null
Write-Host "Windows font source contains:" ( Get-ChildItem F: | Measure-Object ).Count "files"

Write-Host "Enabling Windows ServerMediaFoundation feature..."
Enable-WindowsOptionalFeature -FeatureName "ServerMediaFoundation" -Online -LimitAccess -Source W:\

if ("${env:INSTALLATION_TYPE}" -eq "Server") {
    Write-Host "Enabling Windows fonts feature..."

    Enable-WindowsOptionalFeature -FeatureName `
        "ServerCoreFonts-NonCritical-Fonts-MinConsoleFonts", `
        "ServerCoreFonts-NonCritical-Fonts-Support", `
        "ServerCoreFonts-NonCritical-Fonts-BitmapFonts", `
        "ServerCoreFonts-NonCritical-Fonts-TrueType", `
        "ServerCoreFonts-NonCritical-Fonts-UAPFonts" `
        -Online -LimitAccess -Source W:\ | Out-Null
}
else {
    Write-Host "Copying Windows fonts from the host machine..."

    Copy-Item -Path "F:\*" -Destination "${env:windir}\Fonts" -Include "*.fon", "*.ttf", "*.ttc" -Force
}
