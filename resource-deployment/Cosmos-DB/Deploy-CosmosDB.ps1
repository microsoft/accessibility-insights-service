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

Function DeployCosmosDB
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
     [Parameter(Mandatory=$True)]
     [string]
     $resourceGroupName,

     [string]
     $resourceGroupLocation,

    [string]
     $datalakeSubscriptionId,

     [string]
     $templateFilePath = "cosmos-db.template.json",

     [string]
     $parametersFilePath = "cosmod-db.parameters.json"
    )

    #******************************************************************************
    # Script body
    # Execution begins here
    #******************************************************************************
    $ErrorActionPreference = "Stop"

    # Register RPs
    $resourceProviders = @("microsoft.documentdb");
    if($resourceProviders.length) {
        Write-Host "Registering resource providers"
        foreach($resourceProvider in $resourceProviders) {
            RegisterRP($resourceProvider);
        }
    }

    #Create or check for existing resource group
    $resourceGroup = Get-AzureRmResourceGroup -Name $resourceGroupName -ErrorAction SilentlyContinue
    if(!$resourceGroup)
    {
        Write-Host "Resource group '$resourceGroupName' does not exist. To create a new resource group, please enter a location.";
        if(!$resourceGroupLocation) {
            $resourceGroupLocation = Read-Host "resourceGroupLocation";
        }
        Write-Host "Creating resource group '$resourceGroupName' in location '$resourceGroupLocation'";
        New-AzureRmResourceGroup -Name $resourceGroupName -Location $resourceGroupLocation
    }
    else{
        Write-Host "Using existing resource group '$resourceGroupName'";
    }
    $templateJSON = Get-Content -Raw -Path $PSScriptRoot/$templateFilePath;
    $templateJSON -replace '@subscriptionId@', $datalakeSubscriptionId | Set-Content -Path $PSScriptRoot/$templateFilePath

    Write-Host "Starting deployment of CosmosDB...";
    if(Test-Path $parametersFilePath) {
        New-AzureRmResourceGroupDeployment -ResourceGroupName $resourceGroupName -TemplateFile $PSScriptRoot/$templateFilePath -TemplateParameterFile $PSScriptRoot/$parametersFilePath;
    } else {
        New-AzureRmResourceGroupDeployment -ResourceGroupName $resourceGroupName -TemplateFile $PSScriptRoot/$templateFilePath;
    }
    Write-Host "CosmosDB deployed successfully...";
}
