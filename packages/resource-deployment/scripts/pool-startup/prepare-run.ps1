# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

$dotenvTaskPath = "$env:AZ_BATCH_TASK_WORKING_DIR\.env"
$dotenvCommonPath = "$env:AZ_BATCH_NODE_SHARED_DIR\.env"

function createEnvironmentFile() {
    $dotenv = ""

    # Select environment variables to pass into container
    $vars = Get-ChildItem Env: | Select-Object -Property Name, Value | Where-Object { $_.Name -match "^AZ_*|^AI_*" }
    foreach ($var in $vars) {
        $dotenv += "$($var.Name)=$($var.Value)`n"
    }

    # Merge with common environment variables if any
    if (Test-Path $dotenvCommonPath -PathType Leaf) {
        Get-Content $dotenvCommonPath -Raw | Set-Content $dotenvTaskPath -Force
        Add-Content $dotenvTaskPath -Value $dotenv
    }
    else {
        Set-Content $dotenvTaskPath -Value $dotenv -Force
    }

    Write-Host "Created environment variables file."
}

createEnvironmentFile
