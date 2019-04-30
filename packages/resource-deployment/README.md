# Deploy Resources for Accessibility Insights Service

The deployment script is going to create Resource Group and deploy Storage Account, Batch Account and CosmosDB under it.

### 1. Clone the repository

-   Clone the repository using one of the following commands
    ```bash
    git clone https://github.com/Microsoft/accessibility-insights-service.git
    ```
-   Select the deployment directory
    ```bash
    cd accessibility-insights-service/resource-deployment
    ```

### 2. Install Azure-Cli

-   Follow instructions from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest

### 3. Login to azure-cli

-   ```bash
    az login
    ```

### 4. Create Azure Resource Group

-   Run below command to get supported locations and choose where you want to deploy resources

    ```bash
    az account list-locations
    ```

    Create Resource Group

-   ```bash
     az group create --subscription <subscriptionId> --name <resourceGroupName> --location <resourceGroupLocation>
    ```

### 5. Deploy Storage Account

-   ```bash
    az group deployment create  --resource-group <resourceGroupName> --template-file "./blob-storage/blob-storage.template.json" --parameters "./blob-storage/blob-storage.parameters.json"
    ```

### 6. Create Queue in Storage Account

-   Default storage account name is 'a11yaxisstorage' if you have changed it please specify accordingly
    ```bash
    az storage queue create --name scanrequest --account-name a11yaxisstorage
    ```

### 7. Deploy Batch Account

-   ```bash
    az group deployment create  --resource-group <resourceGroupName> --template-file "./batch-account/batch-account.template.json" --parameters "./Batch-Account/batch-account.parameters.json"
    ```

### 8. Deploy CosmosDB

-   ```bash
    az group deployment create  --resource-group <resourceGroupName> --template-file "./cosmos-db/cosmos-db.template.json" --parameters "./cosmos-db/cosmos-db.parameters.json"
    ```

### 9. Deploy AppInsights

-   ```bash
    az group deployment create  --resource-group <resourceGroupName> --template-file "./app-insights/app-insights.template.json" --parameters "./app-insights/app-insights.parameters.json"
    ```

### 10. Login to Azure portal to verify the Resources are being created

-   Resource Group is created
-   And all the resources are deployed under the resource group.

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
