# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

$gateway = (Get-NetRoute '0.0.0.0/0').NextHop
net use S: \\$gateway\WinSxS /user:DockerBuild "${env:BUILD_KEY}" | Out-Null

if ("${env:installationType}" -eq "Server") {
    Write-Host "Enabling Windows fonts feature..."

    Import-Module DISM
    Enable-WindowsOptionalFeature -FeatureName `
        "ServerCoreFonts-NonCritical-Fonts-MinConsoleFonts", `
        "ServerCoreFonts-NonCritical-Fonts-Support", `
        "ServerCoreFonts-NonCritical-Fonts-BitmapFonts", `
        "ServerCoreFonts-NonCritical-Fonts-TrueType", `
        "ServerCoreFonts-NonCritical-Fonts-UAPFonts" `
        -Online -LimitAccess -Source S:\ | Out-Null
}
else {
    Write-Host "Copying Windows fonts from the host machine..."

    Copy-Item -Path "S:\*" -Destination "${env:windir}\Fonts" -Include "*.fon", "*.ttf", "*.ttc" -Force
}
