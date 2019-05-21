set -eo pipefail

createCosmosCollection() {
    collectionName=$1
    dbName=$2
    cosmosAccountName=$3
    resourceGroupName=$4

    echo "Checking if collection '$collectionName' exists in db '$dbName' of cosmosAccount '$cosmosAccountName' in resource group '$resourceGroupName'"
    collectionExists=$(az cosmosdb collection exists --collection-name "$collectionName" --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName")

    if [ $collectionExists = true ]; then
        echo "$collectionName already exists"
    else
        az cosmosdb collection create --collection-name "$collectionName" --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName" --partition-key-path "/partitionKey" --throughput 10000
        echo "Successfully created $collectionName"
    fi
}

createCosmosDatabase() {
    dbName=$1
    cosmosAccountName=$2
    resourceGroupName=$3

    echo "Checking if database '$dbName' exists in cosmosAccount '$cosmosAccountName' in resource group '$resourceGroupName'"
    collectionExists=$(az cosmosdb database exists --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName")

    if [ $collectionExists = true ]; then
        echo "$collectionName already exists"
    else
        az cosmosdb database create --db-name "$dbName" --name "$cosmosAccountName" --resource-group-name "$resourceGroupName"
        echo "Successfully created $collectionName"
    fi
}