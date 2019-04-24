<#
 .SYNOPSIS
    Deploys a template to Azure

 .DESCRIPTION
    Deploys an Azure Resource Manager template

 .PARAMETER subscriptionName
    The subscription name where the template will be deployed.

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
 $subscriptionName,
[Parameter(Mandatory=$False)]
 [string]
 $resourceGroupLocation = 'West US 2'
)

. ResourceGroup/Deploy-ResourceGroup.ps1
. Blob-Storage/Deploy-Blob-Storage.ps1
. Cosmos-DB/Deploy-CosmosDB.ps1
. Batch-Account/Deploy-Batch-Account.ps1
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

#******************************************************************************
# Script body
# Execution begins here
#******************************************************************************
$ErrorActionPreference = "Stop"

# sign in
Write-Host "Logging in...";
Login-AzureRmAccount;

# select subscription
Write-Host "Selecting subscription '$subscriptionName'";
Select-AzureRmSubscription -SubscriptionName $subscriptionName;
$resourceGroupName = Read-Host -Prompt "Enter Resource Group Name"

DeployResourceGroup -resourceGroupName $resourceGroupName -resourceGroupLocation $resourceGroupLocation;
DeployBlobStorage -resourceGroupName $resourceGroupName -resourceGroupLocation $resourceGroupLocation;
DeployCosmosDB -resourceGroupName $resourceGroupName -resourceGroupLocation $resourceGroupLocation;
DeployBatchAccount -resourceGroupName $resourceGroupName -resourceGroupLocation $resourceGroupLocation;
