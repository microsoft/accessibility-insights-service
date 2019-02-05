# Accessibility Insights Service

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

### 4. Create dev.DockerFile file for local deployment

-   Create dev.DockerFile under src\scanner\dev-docker from the dev.template.DockerFile which is under the same folder. **DO NOT checkin this file**.
    -   From src\scanner\dev-docker, clone dev.template.DockerFile & rename it to dev.DockerFile under the same directory.
    -   Get the secrets mentioned in the json from azure portal.
        -   For eg, AzureWebJobsStorage, go to the storage account you want to use in portal.
        -   Click on access keys from the left tab.
        -   Copy one of the connection strings.
        -   Paste it as the value for AzureWebJobsStorage in the local.settings.json

### 5. Build & deploy locally from vscode

-   Open workspace.code-workspace from .vscode\ folder under root directory.
-   On opening the workspace, it will suggest you to install the recommended extensions. Install them.
-   Go to a azure function project (eg, scanner) & open a file, say index.ts
-   Execute "Attach to JavaScript Functions" launch task. This build the project & deploys azure function locally.
    You can do this by either of the below two options.
    -   Press F5. (Make sure the correct launch task is selected from the drop down that appears).
    -   Or Press Ctrl+P and then type "debug" followed by space ' '. And then select "Attach to JavaScript Functions" from the list that appears.
-   Perform trigger operation to trigger an azure function. For eg, create a message in scan-url-queue azure queue to trigger scan-url function

### 6. Build & deploy locally from command line

-   Build project

    ```bash
       npm run build
    ```

-   Build base container image

    ```bash
       cd src/scanner/dist
       func extensions install
       cd ../
       docker build -t scanner .
    ```

-   Build dev container image

    ```bash
       cd src/scanner/dev-docker
       docker build -t scanner-dev .
    ```

-   Deploy locally (goto the function folder you want to deploy. in this case, scanner function project is used)

    ```bash
       docker run -p 8080:80 -it scanner-dev
    ```

-   Perform trigger operations for the corresponding azure function. For eg, create a message in scan-url-queue azure queue to trigger scan-url function

### 7. Build & deploy to production

-   If you already have azure function created in azure & have container registry setup, go to last two steps.
-   Create the azure function you are trying to deploy to. Refer https://docs.microsoft.com/en-us/azure/azure-functions/functions-create-function-linux-custom-image
    for more information on how to create the azure function.
    Set AzureWebJobsStorage setting as the storage account connection string under App Settings of your Azure function.
-   Create a Container registry in your azure subscription. Refer https://docs.microsoft.com/en-us/azure/container-registry/ for more information.
-   Build Docker image

    ```bash
       cd src/scanner
       npm run cbuild
       docker build -t scanner .
    ```

-   Deploy to container image to production

    ```bash
      docker login <docker-id> // Login Server name under Access keys section of your azure container registry
      docker tag scanner <docker-id>/scanner
      docker push <docker-id>/scanner
    ```

## Testing

### 1. Run Unit tests from command line

-   Run the below command
    ```bash
          npm test
    ```

### 2. Run current test file from vscode

-   Execute "Debug current unit test file" launch task. This build the project & deploys azure function locally.
    You can do this by either of the below two options.

    -   Press F5. (Make sure the correct launch task is selected from the drop down that appears).
    -   Or Press Ctrl+P and then type "debug" followed by space ' '. And then select "Debug current unit test file" from the list that appears.

### 3. Run test in watch mode

-   You can run tests whenever source code is modified in watch mode.

    ```bash
          npm run watch:test
    ```

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
