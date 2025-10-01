[CmdletBinding()]
Param()

$ErrorActionPreference = "Stop"

function updateConfig($configPath, $key, $value) {
    if (-not (Test-Path -Path $configPath -PathType Leaf)) {
        Set-Content -Path $configPath -Value "$key=$value"
    }
    else {
        $regex = "^" + $key + "=(.*)$"
        $content = Get-Content $configPath

        if ($content -match $regex) {
            $content = $content -replace $regex, "$key=$value"
            Set-Content -Path $configPath -Value $content
        }
        else {
            Add-Content -Path $configPath -Value "$key=$value"
        }
    }
}

function getIPGeolocation($configPath) {
    $resourceGroup = az batch account list --query "[?name=='$env:AZ_BATCH_ACCOUNT_NAME'][].resourceGroup" -o tsv
    az batch account login --name "$env:AZ_BATCH_ACCOUNT_NAME" --resource-group "$resourceGroup"

    $ip = az batch node show --node-id "$env:AZ_BATCH_NODE_ID" --pool-id "$env:AZ_BATCH_POOL_ID" --query endpointConfiguration.inboundEndpoints[].publicIpAddress[] -o tsv
    $region = az batch account list --query "[?name=='$env:AZ_BATCH_ACCOUNT_NAME'][].location" -o tsv

    $ipGeolocation = "{`"ip`": `"$ip`", `"region`": `"$region`"}"
    updateConfig $configPath "IP_GEOLOCATION" $ipGeolocation
}

function getMachineInfo($configPath) {
    $containerGateway = (Get-NetIPAddress -AddressFamily IPV4 | Where-Object { $_.InterfaceAlias -eq "vEthernet (nat)" }).IPAddress
    $machineInfo = "{`"container`": true, `"host`": `"$containerGateway`"}"
    updateConfig $configPath "MACHINE_INFO" $machineInfo
}

function getEnvironmentFile() {
    $configPath = "$env:AZ_BATCH_NODE_SHARED_DIR\.env"
    getIPGeolocation $configPath
    getMachineInfo $configPath

    Write-Output "Generated $configPath environment file:"
    Get-Content $configPath
    Write-Output ""
}

getEnvironmentFile
