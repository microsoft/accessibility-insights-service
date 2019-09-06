<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

# How to re-create deployable API templates from an API management instance.

1.  Clone the [extractor tool repo](https://github.com/Azure/azure-api-management-devops-resource-kit).

2.  Ensure that dotnet core is installed. Run `dotnet` from the terminal to see if it is installed.

3.  Navigate to `azure-api-management-devops-resource-kit/src/APIM_ARMTemplate/apimtemplate`

4.  Run the following command with values substituted as appropriate.  
    `dotnet run extract --sourceApimName a11y-insights --destinationApimName modelGateway --resourceGroup a11y-test --fileFolder ./ExtractedApi --linkedTemplatesBaseUrl https://publicStorage --apiName accessibility-insight-service-scan-api`  
    where:  
     `sourceApimName`: The name of the API management instance that is being targeted fro extraction.  
     `destinationApimName`: The name of the destination API management instance. A random value can be put in here since it is parameterized and can be overridden at deploy time.  
     `resourceGroup`: The resource group.  
     `fileFolder`: Folder location to dump the generated files  
     `linkedTemplatesBaseUrl`: Can use any value here. Using a value here force the tool to generate a master template that has the order of execution.  
     `apiName`: Name of the api to extract.

5.  After the templates have been extracted, the endpoints that refer to a function backend need to parameterized.

    1.  Open the `*.backends.template.json` file and add the following to the `parameters` section.
        ```json
        "functionName":{
            "value" : "your-function-app-value"
        }
        ```
    2.  Replace all occurrences of the function name with the parameter `$functionName`.
        Replace the group name in `properties>resourceId` from "`randomResourceGroup`" (Or your equivalent, see example) to `resourceGroup().name`

               For example -
              Before
              ```json
              {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "parameters": {
                  "ApimServiceName": {
                    "type": "string"
                  }
                },
                "resources": [
                  {
                    "properties": {
                      "description": "clean-function-app",
                      "resourceId": "https://management.azure.com/subscriptions/tenant-ID/resourceGroups/<randomResourcegroup>/providers/Microsoft.Web/sites/<clean-function-app>",
                      "credentials": {
                        "header": {
                          "x-functions-key": [
                            "{{clean-function-app-key}}"
                          ]
                        }
                      },
                      "url": "https://clean-function-app.azurewebsites.net/api",
                      "protocol": "http"
                    },
                    "name": "[concat(parameters('ApimServiceName'), '/clean-function-app')]",
                    "type": "Microsoft.ApiManagement/service/backends",
                    "apiVersion": "2019-01-01"
                  }
                ]
              }
              ```
              After
              ```json
              {
                "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "parameters": {
                  "apimServiceName": {
                    "type": "string"
                  },
                  "functionName":{
                    "type": "string"
                  }
                },
                "resources": [
                  {
                    "properties": {
                      "description": "[parameters('functionName')]",
                      "resourceId": "[concat('https://management.azure.com/subscriptions/76eb140e-abd4-4a17-ad98-534d0f8d2759/resourceGroups/', resourceGroup().name, '/providers/Microsoft.Web/sites/',parameters('functionName'))]",
                      "credentials": {
                        "header": {
                        }
                      },
                      "url": "[concat('https://', parameters('functionName'), '.azurewebsites.net/api')]",
                      "protocol": "http"
                    },
                    "name": "[concat(parameters('apimServiceName'), '/', parameters('functionName'))]",
                    "type": "Microsoft.ApiManagement/service/backends",
                    "apiVersion": "2019-01-01"
                  }
                ]
              }
              ```
            3. Open the `*apis.template.json` file
               1. Add the following to the parameters
                  ```json
                  "functionName":{
                      "type" : "string"
                  }
                  ```
                2. Change the value of the function app name wherever it is set in the policies. Search for `<set-backend-service` and change the `backend-id` property to use `$functionName` instead.

6.  Delete the `*-master.template.json` and the `*-parameters.json` file.

7.  Change the files to ensure that they are named as follows.  
    `Note: This is necessary to ensure that the deploy scripts work.`

    ```
    model-accessibility-insight-service-scan-api-api.template.json
    model-apiVersionSets.template.json
    model-authorizationServers.template.json
    model-backends.template.json
    model-loggers.template.json
    model-namedValues.template.json
    model-products.template.json
    ```

8.  Open `*.namedValues.template.json` and delete the key.
