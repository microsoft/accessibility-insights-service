# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

param ($nodeargs = '')

Write-Host "Adding network route for Azure Instance Metadata Service endpoint..."
$gateway = (Get-NetRoute '0.0.0.0/0').NextHop
$arguments = 'add', '169.254.169.0', 'mask', '255.255.255.0', $gateway
route $arguments | Out-Null

Write-Host "Trigger a virtual display by starting a GUI process"
$key = ConvertTo-SecureString $env:USER_KEY -AsPlainText -Force
Start-Process -FilePath "notepad.exe" -Credential (New-Object System.Management.Automation.PSCredential("ContainerUser", $key)) -NoNewWindow
Start-Sleep -Seconds 5

# Write-Host "Validate if software rendering is enabled"
# Get-WmiObject Win32_VideoController | Select-Object Name

node $nodeargs --max-old-space-size=8192 ./web-api-scan-runner.js
