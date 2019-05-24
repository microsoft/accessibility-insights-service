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

### 4. Clean

-   Run below command to delete resource group if it exists

    ```bash
    ./scripts/delete-resource-group.sh -r <resourceGroupName>
    ```

### 5. Deploy

-         Run below command to:

          		-	Create Azure Resource Group
          		-	Deploy Storage Account
          		-	Create Queue in Storage Account
          		-	Deploy Batch Account
          		-	Deploy CosmosDB
          		-	Deploy AppInsights
          		-	Upload the service binaries to the Blob containers
          		-	Setup url-scan-schedule job schedule
          		-	Setup scan-req-schedule job schedule

        		```bash
        		./scripts/install.sh -r <resource group> -s <subscription name or id> -l <location>
        		```

### 6. Login to Azure portal to verify the Resources are being created

-   Resource Group is created.
-   All the resources are deployed under the resource group.
-   And all jobs are scheduled.

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
