<#
.SYNOPSIS
    Registers RPs
#>
Function RegisterRP {
    Param(
        [string]$ResourceProviderNamespace
    )

    Write-Host "Registering resource provider '$ResourceProviderNamespace'";
    Register-AzureRmResourceProvider -ProviderNamespace $ResourceProviderNamespace;
}

Function DeployResourceGroup
{
    <#
     .SYNOPSIS
        Deploys a template to Azure

     .DESCRIPTION
        Deploys an Azure Resource Manager template

     .PARAMETER subscriptionId
        The subscription id where the template will be deployed.

     .PARAMETER resourceGroupName
        The resource group where the template will be deployed. Can be the name of an existing or a new resource group.

     .PARAMETER resourceGroupLocation
        Optional, a resource group location. If specified, will try to create a new resource group in this location. If not specified, assumes resource group is existing.

     .PARAMETER deploymentName
        The deployment name.

     .PARAMETER templateFilePath
        Optional, path to the template file. Defaults to template.json.

     .PARAMETER parametersFilePath
        Optional, path to the parameters file. Defaults to parameters.json. If file is not found, will prompt for parameter values based on template.
    #>

    param(
     [string]
     $resourceGroupName,

     [string]
     $resourceGroupLocation,

     [string]
     $templateFilePath = 'resource-group.template.json',

     [string]
     $parametersFilePath = 'resource-group.parameters.json'
    )
    #******************************************************************************
    # Script body
    # Execution begins here
    #******************************************************************************
    $ErrorActionPreference = "Stop"

    # Register RPs
    # Register RPs
    $resourceProviders = @();
    If($resourceProviders.length) {
        Write-Host "Registering resource providers"
        foreach($resourceProvider in $resourceProviders) {
            RegisterRP($resourceProvider);
        }
    }

    if(!$resourceGroupName)
    {
        $resourceGroupName = Read-Host -Prompt "Enter Resource Group Name"
    }

    #Create or check for existing resource group
    $resourceGroup = Get-AzureRmResourceGroup -Name $resourceGroupName -ErrorAction SilentlyContinue
    if(!$resourceGroup)
    {
        Write-Host "Resource group '$resourceGroupName' does not exist. To create a new resource group, please enter a location.";
        if(!$resourceGroupLocation) {
            $resourceGroupLocation = Read-Host "Enter resource group location";
        }
        Write-Host "Creating resource group '$resourceGroupName' in location '$resourceGroupLocation'";
        New-AzureRmResourceGroup -Name $resourceGroupName -Location $resourceGroupLocation
    }
    else{
        Write-Host "Using existing resource group '$resourceGroupName'";
    }

    # Start the deployment
    Write-Host "Starting deployment for Azure Resource Group...";
    if(Test-Path $parametersFilePath) {
        New-AzureRmResourceGroupDeployment -ResourceGroupName $resourceGroupName -TemplateFile $PSScriptRoot/$templateFilePath -TemplateParameterFile $PSScriptRoot/$parametersFilePath;
    } else {
        New-AzureRmResourceGroupDeployment -ResourceGroupName $resourceGroupName -TemplateFile $PSScriptRoot/$templateFilePath;
    }
}
