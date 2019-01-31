# Accessibility Insights for Service

## Building the code

### 1. Clone the repository

-   Clone the repository using one of the following commands
    ```bash
    git clone https://github.com/Microsoft/accessibility-insights-service.git
    ```
-   Select the created directory
    ```bash
    cd accessibility-insights-service
    ```

### 2. Install Azure Function core tools

-   Follow the instructions in https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local to install azure cli tools for building, running & deploying azure functions

### 3. Install packages

-   Install the packages
    ```bash
    npm install
    ```

### 4. Create local.settings.json file for local deployment

-   Create local.settings.json files for each azure function. **DO NOT checkin this file**.
    -   From each local.settings.template.json, create local.settings.json in the same directory.
    -   Get the secrets mentioned in the json from azure portal.
        -   For eg, AzureWebJobsStorage, go to the storage account you want to use in portal.
        -   Click on access keys from the left tab.
        -   Copy one of the connection strings.
        -   Paste it as the value for AzureWebJobsStorage in the local.settings.json

### 5. Build & deploy from vscode

-   Open workspace.code-workspace from .vscode\ folder under root directory.
-   On opening the workspace, it will suggest you to install the recommended extensions. Install them.
-   Go to a azure function project (eg, scanner) & open a file, say index.ts
-   Press F5. (Make sure the right launch task is selected from the drop down that appears). This build the project & deploys azure function locally.
-   Perform trigger operation to trigger an azure function. For eg, create a message in scan-url-queue azure queue to trigger scan-url function

### 5. Build & deploy from command line

-   Build project

    ```bash
       npm run build
    ```

-   Copy local.settings.json to dist folder

    ```bash
       npm run copy-local-settings
    ```
-   Copy local.settings.json to dist folder

    ```bash
       npm run copy-chrome-dev
    ```    
-   Deploy locally (goto the function folder you want to deploy. in this case, scanner function project is used)
    ```bash
       cd src/scanner/dist
       func extensions install
       func host start
    ```
-   Perform trigger operations for the corresponding azure function. For eg, create a message in scan-url-queue azure queue to trigger scan-url function

## Testing

### 1. From command line

-   Run unit tests
    ```bash
       npm test
    ```
