<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

Before you start, make sure you have the Owner permission, or Contributor with User Access Administrator permission for the subscription. To learn more about how to give role based access, check [Manage access to Azure resources using RBAC and the Azure portal](https://docs.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal).

# Deploy Resources for Accessibility Insights Service

The deployment script is going to create Resource Group and deploy Storage Account, Batch Account and CosmosDB under it.

### 1. Accept Azure Marketplace legal terms

Before to deploy the Azure Batch pool virtual machine image you need to accept the Azure Marketplace legal terms one time on Azure subscription level. To accept legal terms use PowerShell Get-AzureRmMarketplaceTerms and Set-AzureRmMarketplaceTerms [API](https://go.microsoft.com/fwlink/?linkid=862451).

You can use the following PowerShell commands to accept the Azure Marketplace legal terms:

```PowerShell
Add-AzureRmAccount
Set-AzureRmContext -SubscriptionId <The name or id of the subscription> -TenantId <Tenant name or ID>
Get-AzureRmMarketplaceTerms -Publisher 'microsoft-azure-batch' -Product 'ubuntu-server-container' -Name '16-04-lts' | Set-AzureRmMarketplaceTerms -Accept
```

### 2. Clone the repository

-   Clone the repository using one of the following commands
    ```bash
    git clone https://github.com/Microsoft/accessibility-insights-service.git
    ```
-   Select the deployment directory
    ```bash
    cd accessibility-insights-service/resource-deployment
    ```

### 3. Install Azure-Cli

-   Follow instructions from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest

### 4. Login to Azure-Cli

-   ```bash
    az login
    ```

### 5. Build repository

-   Run the below command from repository root folder to build all packages

    ```bash
    yarn build
    ```

### 6. Delete resource group

-   Run below command to delete the resource group if it exists

    ```bash
    ./dist/scripts/delete-resource-group.sh -r <resourceGroupName>
    ```

### 7. Deploy

-   Run below command to deploy Azure resources and binaries

    ```bash
    ./dist/scripts/install.sh -r <resource group> -s <subscription name or id> -l <location>
    ```

### 8. Login to Azure portal to verify the resources are being created

-   Resource group is created
-   All the resources are deployed under the resource group
-   And all Batch jobs are scheduled

# Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
