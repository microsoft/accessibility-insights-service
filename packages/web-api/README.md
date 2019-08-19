<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

# Accessibility Insights Service Scan REST API

The Scan REST API is implemented as a set of Azure Functions REST endpoints as defined in [REST API contract](https://github.com/microsoft/accessibility-insights-service/tree/master/packages/api-contracts).

## Deployment

There are several options to deploy Azure Functions. Some of them are using [Visual Studio Code](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#publish) or [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local). Follow to the preferred guide to deploy Azure Functions.

The example below will use Azure Functions Core Tools. Install required packages following the steps from the guide [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#install-the-azure-functions-core-tools).

Build the [web-api](https://github.com/microsoft/accessibility-insights-service/tree/master/packages/web-api) package from a command console:

```bash
        cd accessibility-insights-service/packages/web-api
        yarn build
```

Deploy Azure Functions binaries to the Azure Functions App. The Azure Functions App can be created following the steps from the guide [here](https://docs.microsoft.com/en-us/azure/azure-functions/scripts/functions-cli-create-serverless).

```bash
        cd accessibility-insights-service/packages/web-api
        func azure functionapp publish <FunctionAppName>
```

## Debugging

Azure Functions local debugging is supported from within Visual Studio Code by running function host locally and attaching to the host process. More details on how to to debug Azure Functions can be found [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#start).

Select "Attach to Azure Functions host" from Debug options within Visual Studio Core. When function host is started use any client tool to send HTTP request to the local host URL printed in terminal console.
