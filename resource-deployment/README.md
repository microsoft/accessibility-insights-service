# Deploy Resources for Accessibility Insights Service

The deployment script is going to create Resource Group and deploy Storage Account, Batch Account and CosmosDB under it.

### 1. Clone the repository

-   Clone the repository using one of the following commands
    ```bash
    git clone https://github.com/Microsoft/accessibility-insights-service.git
    ```
-   Select the created directory
    ```bash
    cd accessibility-insights-service
    ```

### 2. Install AZ powershell module

#### 2.1 Windows users

-   Open PowerShell Window
    ```bash
    Install-Module -Name Az -AllowClobber from powershell
    ```

#### 2.2 Mac users

-   Install power shell
    ```bash
    brew cask install powershell
    ```
-   Open Powershell
    ```bash
    sudo pwsh
    ```
-   Install AZ module
    ```bash
    Save-Module -Name Az -Path /usr/local/microsoft/powershell/6/Modules
    Install-Module -Name Az
    ```

### 3. Run Deployment script

-   Select the script directory

    ```bash
    cd accessibility-insights-service\resource-deployment
    ```

-   Run Deployment Script
    ```bash
    ./Deploy-Azure-Resources.ps1
    ```

### 4. Login to Azure portal to verify the Resources are being created

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
