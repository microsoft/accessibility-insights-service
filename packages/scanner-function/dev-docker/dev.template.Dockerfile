# This file can be used to create a local copy of dev.DockerFile in the current folder.
# secrets for the configs can be fetched from azure portal
FROM scanner
ENV AzureWebJobsStorage="<copy your storage account connection string from azure portal>"
ENV COSMOSDB_Connection="<copy connection string from Keys section in your cosmos db>"
ENV APPINSIGHTS_INSTRUMENTATIONKEY="<copy App Insights instrumentation key>"
# workaround for https://github.com/Azure/azure-functions-host/issues/3469
ENV AzureFunctionsJobHost__Logging__Console__IsEnabled=true
