<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

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

### 2. Install package specific dependencies

-   Goto the package (under /packages) that you will be working on & follow the readme file under that package.

### 3. Install packages

-   We use yarn for dependencies management. You can install it from [here](https://yarnpkg.com/en/docs/install).
    ```bash
    yarn install
    ```

### 4. Working from from vscode

-   Open workspace.code-workspace from .vscode\ folder under root directory.
-   On opening the workspace, it will suggest you to install the recommended extensions. Install them.

### 5. Build from command line

-   Build project

    ```bash
       yarn build
    ```

### 6. Commands to run before check in

-   Run the below command to build, test, check file format styling & tslint issues
    ```bash
    yarn precheckin
    ```
-   If the above command failed for formatting issues, run the below command to format all files
    ```bash
    yarn format
    ```

## Testing

### 1. Run Unit tests from command line

-   Run the below command
    ```bash
          yarn test
    ```

### 2. Run current test file from vscode

-   Execute "Debug current unit test file" launch task. This build the project & deploys azure function locally.
    You can do this by either of the below two options.

    -   Press F5. (Make sure the correct launch task is selected from the drop down that appears).
    -   Or Press Ctrl+P and then type "debug" followed by space ' '. And then select "Debug current unit test file" from the list that appears.

### 3. Run test in watch mode

-   Goto the package you want to watch for. You can run tests whenever source code is modified in watch mode.

    ```bash
          yarn watch:test
    ```

## Deployment

-   Follow this [README](https://github.com/Microsoft/accessibility-insights-service/blob/master/packages/resource-deployment/README.md) to deploy required Azure resources.

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
