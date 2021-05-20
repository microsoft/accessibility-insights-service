# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

Write-Host "Adding route for Managed Service Identity"
$gateway = (route print | ?{$_ -like "*0.0.0.0*0.0.0.0*"} | %{$_ -split " "} | ?{$_.trim() -ne "" } | ?{$_ -ne "0.0.0.0" })[0]
$arguments = 'add','169.254.169.0','mask','255.255.255.0',$gateway
&'route' $arguments

Write-Host "Starting runner..."
node ./web-api-scan-runner.js
