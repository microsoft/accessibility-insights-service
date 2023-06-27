# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

$variables = Select-String -Path './.env' -Pattern '^\s*[^\s=#]+=[^\s]+$' | Select-Object -ExpandProperty Line

foreach($var in $variables) {
    $keyVal = $var -split '=', 2
    $key = $keyVal[0].Trim()
    $val = $keyVal[1]
    [Environment]::SetEnvironmentVariable($key, $val)
    Write-Host "$key=$([Environment]::GetEnvironmentVariable($key))"
}

node ./privacy-scan-runner.js
