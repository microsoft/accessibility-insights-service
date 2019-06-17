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

### 4. Working from Visual Studio Code

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

### 2. Run current test file from Visual Studio Code

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

## Debugging

To debug packages locally follow the generic steps below.

1.  Complete deployment of Azure resources on your test subscription.
2.  Create `.env` plain text file under package root folder with environment variables set required for the package to run. For instance, refer to the batch task schedule `url-scan-schedule.template.json` [template](https://github.com/microsoft/accessibility-insights-service/tree/master/packages/resource-deployment/templates) configuration for a list of common environment settings. There is a pre-built [template](https://github.com/microsoft/accessibility-insights-service/blob/master/packages/resource-deployment/.env.template) file that can be used as well. The `.env` file format:

    ```bash
          VARIABLE_NAME=VARIABLE_VALUE
    ```

3.  Run Bash script `create-sp-for-key-vault.sh` from [here](https://github.com/microsoft/accessibility-insights-service/tree/master/packages/resource-deployment/scripts) to create a debug service principal entity. Copy script output to `.env` file as per script instruction. `Note:` The script can be run multiple times that result the same service principal entity but with password reset.
4.  Run the TypeScript compiler `tsc` for the selected package.
5.  Debug selected package using Visual Studio Code selecting respective debug configuration. For instance, select `Start debugging runner (runner)` configuration to debug `runner` package.

# Contributing

Please visit our [Contributing](https://github.com/Microsoft/accessibility-insights-service/blob/master/CONTRIBUTING.md) page.
