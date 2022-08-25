# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

Write-Host "Adding network route for Azure Instance Metadata Service endpoint"
$gateway = (route print | ?{$_ -like "*0.0.0.0*0.0.0.0*"} | %{$_ -split " "} | ?{$_.trim() -ne "" } | ?{$_ -ne "0.0.0.0" })[0]
$arguments = 'add','169.254.169.0','mask','255.255.255.0',$gateway
&'route' $arguments

$response = Invoke-RestMethod -Headers @{"Metadata"="true"} -Method GET -Uri "http://169.254.169.254/metadata/instance/compute/vmId?api-version=2017-08-01&format=text"
if ($response) { $healthCheck = 'OK' } else { $healthCheck = 'FAILED' }
Write-Host "IMDS health status:" $healthCheck

node ./privacy-scan-runner.js
