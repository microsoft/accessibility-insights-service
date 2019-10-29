<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

# Accessibility Insights Service Web Workers

The apps are implemented as Azure Functions App.

## Deployment

There are several options to deploy Azure Functions. Some of them are using [Visual Studio Code](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#publish) or [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local). Follow to the preferred guide to deploy Azure Functions.

The example below will use Azure Functions Core Tools. Install required packages following the steps from the guide [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#install-the-azure-functions-core-tools).

Build the [apps](https://github.com/microsoft/accessibility-insights-service/tree/master/packages/web-workers) package from a command console:

```bash
        cd accessibility-insights-service/packages/web-workers
        yarn build
```

Deploy Azure Functions binaries to the Azure Functions App. The Azure Functions App can be created following the steps from the guide [here](https://docs.microsoft.com/en-us/azure/azure-functions/scripts/functions-cli-create-serverless).

```bash
        cd accessibility-insights-service/packages/web-workers/dist
        func azure functionapp publish <FunctionAppName>
```

## Debugging

Azure Functions local debugging is supported from within Visual Studio Code by running function host locally and attaching to the host process. More details on how to to debug Azure Functions can be found [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#start).

Select "Attach to Azure Functions host" from Debug options within Visual Studio Core. When function host is started use any client tool to send HTTP request to the local host URL printed in terminal console.

### Debugging Durable Functions

Debugging of Azure Durable Functions require few additional steps. The Azure Storage should be configured for use by the durable function instance. When running debugging on Windows the Azure Storage Emulator can be used instead. When there is no Azure Storage Emulator available the **local.settings.json** file should have the **AzureWebJobsStorage** property set to the valid Azure Storage connection string value.

When debugging a durable function, it is recommended to trigger durable function instance directly. Avoid using timer-based Azure function to trigger a durable function instance. Disable the existing timer-based function (if any) by renaming the corresponding **function.json** file.

To trigger the durable function locally use any HTTP web client tool (Postman, etc..) to send the HTTP POST request to the following URL:

```
http://localhost:7071/runtime/webhooks/durabletask/orchestrators/<function name>
```

The corresponding HTTP response will contains URLs to manage the durable function instance that was triggered.

Monitor the durable function execution state and history by checking Azure Storage tables **DurableFunctionsHubInstances** and **DurableFunctionsHubHistory** correspondingly.
