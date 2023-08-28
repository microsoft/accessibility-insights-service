# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

Write-Output "Enable Windows features"

$gateway = (Get-NetRoute '0.0.0.0/0').NextHop
net use S: \\$gateway\WinSxS /user:DockerBuild ${env:BUILD_KEY}

Import-Module DISM
Enable-WindowsOptionalFeature -FeatureName `
    "ServerCoreFonts-NonCritical-Fonts-MinConsoleFonts", `
    "ServerCoreFonts-NonCritical-Fonts-Support", `
    "ServerCoreFonts-NonCritical-Fonts-BitmapFonts", `
    "ServerCoreFonts-NonCritical-Fonts-TrueType", `
    "ServerCoreFonts-NonCritical-Fonts-UAPFonts" `
    -Online -LimitAccess -Source S:\
