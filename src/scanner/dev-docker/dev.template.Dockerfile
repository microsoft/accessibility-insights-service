# This file can be used to create a local copy of dev.DockerFile in the current folder.
# secrets for the configs can be fetched from azure portal
FROM scanner-dev-base
ENV AzureWebJobsStorage="<copy your storage account connection string from azure portal>"
ENV AzureFunctionsJobHost__Logging__Console__IsEnabled=true
