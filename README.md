<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

# ![Product Logo](./icons/brand/blue/brand-blue-48px.png) Accessibility Insights Service

[![Build Status](https://dev.azure.com/accessibility-insights/Accessibility%20Insights%20Service/_apis/build/status/Accessibility-Insights-Service%20CI?branchName=main)](https://dev.azure.com/accessibility-insights/Accessibility%20Insights%20Service/_build/latest?definitionId=28&branchName=main)
[![codecov](https://codecov.io/gh/microsoft/accessibility-insights-service/branch/main/graph/badge.svg)](https://codecov.io/gh/microsoft/accessibility-insights-service)

Accessibility Insights Service is a service that can be used to scan websites for accessibility issues on a periodic basis. It is TypeScript project with shell scripts for install and update scenarios.

This project can be run in an Azure environment and can be set up easily using the install scripts provided.

## Prerequisites

-   Git
-   Node.js v16
-   TypeScript
-   Yarn v3
-   Visual Studio Code
-   Docker Desktop
-   Ubuntu, WSL, Git Bash, or similar Linux environment

## Building the code

### 1. Clone the repository

-   Clone the repository

    ```bash
    git clone https://github.com/microsoft/privacy-insights-service.git
    ```

-   Select the solution directory

    ```bash
    cd accessibility-insights-service
    ```

### 2. Install packages

-   Run yarn to install initial npm packages

    ```bash
    yarn install
    ```

### 3. Working from Visual Studio Code

-   Open workspace.code-workspace from .vscode\ folder under root directory.
-   On opening the workspace, it will suggest you to install the recommended extensions. Install them.

### 4. Build solution

-   Run yarn to build solution

    ```bash
       yarn build
    ```

### 5. Run before check-in

-   Run the below command to build, test, check file format styling and eslint issues
    ```bash
    yarn precheckin
    ```

## Testing

### 1. Run unit tests

-   Run the below command from the command line to execute all unit tests

    ```bash
          yarn test
    ```

### 2. Run test in watch mode

-   Goto the package you want to watch for. You can run tests whenever source code is modified in watch mode.

    ```bash
          yarn watch:test
    ```

## Deployment

-   Follow this [README](https://github.com/microsoft/privacy-insights-service/blob/main/packages/resource-deployment/README.md) to deploy required Azure resources.

## Debugging

To debug packages locally follow the generic steps below.

1.  Complete deployment of the service in your Azure subscription
2.  Run the following script to get the content of the `.env` plain text file:

    ```bash
          ./packages/resource-deployment/scripts/create-env-file-for-debug.sh -r <resourceGroupName>
    ```

3.  Create the `.env` plain text file under package root folder to debug it locally
4.  Debug selected package using Visual Studio Code selecting respective debug configuration

## Telemetry and Monitoring

During deployment, the Azure dashboard will be created to track service metrics and telemetry data.

-   Documentation for all telemetry events sent can be found [here](packages/logger/README.md)
-   Documentation for the Azure dashboard created upon deployment can be found [here](packages/resource-deployment/templates/dashboard.md)

## Contributing

All contributions are welcome! Please visit our [Contributing](https://github.com/microsoft/privacy-insights-service/blob/main/Contributing.md) page.

## Contact us

Please file a [Github Issue](https://github.com/microsoft/privacy-insights-service/issues/new/choose). We actively monitor PRs and issues.

Alternatively you may also ask questions on stackoverflow.com and tag them with an `accessibility-insights` tag.

## Reporting security vulnerabilities

If you believe you have found a security vulnerability in this project, please follow [these steps](https://technet.microsoft.com/en-us/security/ff852094.aspx) to report it. For more information on how vulnerabilities are disclosed, see [Coordinated Vulnerability Disclosure](https://technet.microsoft.com/en-us/security/dn467923).
