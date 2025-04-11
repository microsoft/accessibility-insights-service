# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# Modify registry to enable a virtual display
Write-Host "Forcing Windows to create a virtual display"
reg add "HKLM\System\CurrentControlSet\Control\GraphicsDrivers" /v EnableFakeDisplay /t REG_DWORD /d 1 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" /v DisableHardwareAcceleration /t REG_DWORD /d 0 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" /v HwSchMode /t REG_DWORD /d 1 /f

$name = "ContainerUser"
$key = ConvertTo-SecureString $env:USER_KEY -AsPlainText -Force
New-LocalUser -Name $name -Password $key -FullName "Container User" -Description "Automated GUI Session"
