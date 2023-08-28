# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# Reference https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment?tabs=dockerce#windows-server-1

$global:rebootRequired = $false

function setPrerequisite() {
    # Disable need to run Internet Explorer's first launch configuration
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Internet Explorer\Main" -Name "DisableFirstRunCustomize" -Value 2
}

function startTranscript() {
    $transcriptFileName = "docker-install.log"
    $nodeRootDir = $env:AZ_BATCH_NODE_ROOT_DIR

    if ($nodeRootDir) {
        $transcriptPath = "$nodeRootDir\$transcriptFileName"
    }
    else {
        $transcriptPath = "$env:TEMP\$transcriptFileName"
    }

    Start-Transcript -Path $transcriptPath -Append -NoClobber
}

function rebootIfRequired() {
    if ($global:rebootRequired -eq $true) {
        Write-Output "Rebooting machine to complete installation..."
        Start-Sleep -Seconds 10
        Stop-Transcript

        shutdown /r /d p:4:2
    }
    else {
        Stop-Transcript
    }
}

# Reference https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-docker/configure-docker-daemon#configure-docker-with-a-configuration-file
function setDockerConfig() {
    $dataRootValue = "D:\docker"
    $configFolder = "C:\ProgramData\Docker\config"
    $configName = "daemon.json"
    $configPath = "$configFolder\$configName"

    # Exit if docker installation does not exist
    if (-not (Test-Path -Path $configFolder)) {
        return
    }

    # Create docker configuration file if it does not exist
    if (-not (Test-Path -Path $configPath -PathType Leaf)) {
        "{}" | Out-File -FilePath $configPath -Force
    }

    $config = Get-Content $configPath -Raw | ConvertFrom-Json

    # Set docker data location
    if ($config."data-root" -and $config."data-root" -ne $dataRootValue) {
        # Update property value
        $config."data-root" = $dataRootValue
        $global:rebootRequired = $true
    }
    elseif (-not $config."data-root") {
        # Add property value
        $config | Add-Member -Name "data-root" -Value $dataRootValue -MemberType NoteProperty
        $global:rebootRequired = $true
    }

    # Set Hyper-V isolation
    $hypervIsolation = "isolation=hyperv"
    if ($config."exec-opts" -is [array]) {
        $isolationOpt = @($config."exec-opts" | Where-Object { $_ -like "isolation*" })
        if (-not ($isolationOpt.Count -eq 1 -and $isolationOpt[0] -eq $hypervIsolation)) {
            # Update property value
            $execOpts = @($config."exec-opts" | Where-Object { $_ -notlike "isolation*" })
            $execOpts += $hypervIsolation
            $config."exec-opts" = $execOpts
            $global:rebootRequired = $true
        }
    }
    elseif (-not $config."exec-opts") {
        # Add property value
        $config | Add-Member -Name "exec-opts" -Value @($hypervIsolation) -MemberType NoteProperty
        $global:rebootRequired = $true
    }

    # Set docker temp directory
    [Environment]::SetEnvironmentVariable("DOCKER_TMPDIR", "$dataRootValue\tmp", "Machine")

    # Trace updated config
    $config | ConvertTo-Json | Set-Content $configPath -Force
    if ($global:rebootRequired -eq $true) {
        Write-Output "Docker config file was successfully updated."
        Write-Output $config | ConvertTo-Json
    }
}

function installHyperV() {
    $feature = Get-WindowsFeature "*hyper-v*"
    if (($feature | Where-Object { $_.Name -eq "Hyper-V" }).InstallState -ne "Installed" -or ($feature | Where-Object { $_.Name -eq "Hyper-V-PowerShell" }).InstallState -ne "Installed") {
        Write-Output "Installing Hyper-V..."
        $install = Install-WindowsFeature -Name Hyper-V, Hyper-V-PowerShell
        if ($install.RestartNeeded -eq "Yes") {
            Start-Sleep -Seconds 10
            Stop-Transcript

            shutdown /r /d p:4:2
        }
    }
    else {
        Write-Output "Hyper-V is installed."
    }

    Set-VMHost -VirtualMachinePath "D:\Hyper-V" -VirtualHardDiskPath "D:\Hyper-V"

    $switch = Get-VMSwitch | Where-Object { $_.Name -eq "vEthernet" }
    if ($switch -eq $null) {
        Write-Output "Creating Hyper-V external virtual switch..."
        New-VMSwitch -Name "vEthernet" -NetAdapterName Ethernet -AllowManagementOS:$true
    }
}

# Reference https://github.com/microsoft/Windows-Containers/tree/Main/helpful_tools/Install-DockerCE
#
# The Docker installation requires script to run twice with intermediate reboot. The second run is
# configured as Windows startup task that runs on user login. We do not want to handle the startup
# task and will run script with machine restart disabled. The second script run, and machine
# restart is managed by this script instead.
function installDockerEngine() {
    Write-Output "Installing Docker Engine..."

    $scriptName = "$env:TEMP\install-docker-ce.ps1"
    Invoke-WebRequest "https://raw.githubusercontent.com/microsoft/Windows-Containers/Main/helpful_tools/Install-DockerCE/install-docker-ce.ps1" -OutFile $scriptName
    Invoke-Expression "$scriptName -NoRestart"

    $global:rebootRequired = $true
}

function validateDockerEngine () {
    Get-Process "dockerd" -ErrorAction SilentlyContinue
    if ($? -eq "True") {
        Write-Output "Docker is running."
        docker info
    }
    else {
        installDockerEngine
    }
}

trap {
    Stop-Transcript
    break
}

startTranscript
setPrerequisite
installHyperV
validateDockerEngine
setDockerConfig
rebootIfRequired
