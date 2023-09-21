<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

# Deploy Resources for Accessibility Insights Service

The deployment script will create Azure resource group and deploy Azure services under it.

Before you start, make sure you have the Owner permission, or Contributor with User Access Administrator permission for the subscription. To learn more about how to give role based access, check [Manage access to Azure resources using RBAC and the Azure portal](https://docs.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal).

## Prerequisites

-   Docker Desktop
-   Azure CLI
-   Postman

Follow instructions from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest to install Azure CLI.

When installing Azure CLI for [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/about) select a Linux corresponding distribution used with WSL.

## Deployment

### 1. Clone the repository and build the solution

-   Follow this [README](https://github.com/microsoft/accessibility-insights-service/blob/main/README.md) to clone the repository and build the solution
-   Select the deployment directory

    ```bash
    cd accessibility-insights-service/packages/resource-deployment
    ```

### 2. Prepare deployment

-   Add Azure Active Directory Application (client) ID(s) (comma separated) to web-api-aad-acl-\*.json [template files](https://github.com/microsoft/accessibility-insights-service/tree/main/packages/resource-deployment/custom-scripts/resource-deployment/templates). This client(s) will be authorized to access service REST APIs.
-   Run [packages/resource-deployment/custom-scripts/prepare-deployment.sh](https://github.com/microsoft/accessibility-insights-service/tree/main/packages/resource-deployment/custom-scripts/prepare-deployment.sh) script to prepare deployment.

### 3. Login to Azure

-   Login to Azure account and set the current active subscription:

    ```bash
    az login
    az account set --subscription <Name or ID of subscription>
    ```

### 4. Create Azure Active Directory application registration

-   Sign in to the Azure portal and create new application registration in Azure Active Directory with provided default settings
-   Add a client secret
-   Use Application (client) ID and secret value in a service deployment

### 5. Allow Azure Batch API to access the subscription

-   Follow this [documentation](https://learn.microsoft.com/en-us/azure/batch/batch-account-create-portal#allow-batch-to-access-the-subscription) to allow Batch to access the subscription
-   Sign in to the Azure portal and assign _Contributor_ role to _Microsoft Azure Batch_ enterprise application on subscription. Follow this [documentation](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal) to assign Azure role.

### 6. Deploy service

-   Run below script with required parameters as specified in a [script's help](https://github.com/microsoft/accessibility-insights-service/blob/main/packages/resource-deployment/scripts/install-parallel.sh) to deploy Azure resources and binaries

    ```bash
    ./dist/scripts/install-parallel.sh -r "<resource group>" -s "<subscription name or ID>" -l "<Azure region>" -e "<environment (dev|ppe|prod)>" -o "<organization name>" -p "<publisher email>" -c "<client ID>" -t "<client secret>" -v "<release version>" -b "<Azure Batch object ID>"
    ```

## Submit scan request

### 1. Create Azure Active Directory client registration

-   Create Azure Active Directory client registration to use with Postman client
-   Sign in to the Azure portal and create new application registration in Azure Active Directory with provided default settings
-   Add a client secret
-   Use Application (client) ID and secret value in Postman client

### 2. Postman setup

-   Open Postman
-   Import all files from [Postman](https://github.com/microsoft/accessibility-insights-service/tree/main/packages/resource-deployment/postman) directory
-   Open "Accessibility Insights Service" environment
-   Set Current Values as follows:
    -   client_id - Azure AD client registration ID
    -   client_secret - Azure AD client registration secret
    -   base_url **and** call_back_url - API Management service Gateway URL (Copy from Azure portal service overview page)
    -   target_client_id - Azure AD application registration ID
    -   token_url - `https://login.microsoftonline.com/<Azure AD (tenant) ID>/oauth2/v2.0/token`
    -   auth_url - `https://login.microsoftonline.com/<Azure AD (tenant) ID>/oauth2/v2.0/authorize`
-   Save environment

### 3. Submit scan request

-   Select "Accessibility Insights Service" environment as active from the top right drop down menu
-   Open "Accessibility Insights Service" collection
-   Select "Get access token" and send request. Token is valid for 24 hours
-   Select "Submit accessibility scan" and send request
-   Select "Get scan status" and send request
-   Monitor scan status by re-submitting request

## Service health

The service health can be monitored via deployed Azure Shared dashboard.

Documentation for the Azure dashboard can be found [here](https://github.com/microsoft/accessibility-insights-service/blob/main/packages/resource-deployment/templates/dashboard.md)

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
