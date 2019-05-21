set -eo pipefail
. './utilities/cosmos-utilities.sh'

# Read script arguments
while getopts "c:r:" option; do
case $option in
    c) cosmosAccountName=${OPTARG};;
    r) resourceGroupName=${OPTARG};;
esac
done

dbName="scanner"
createCosmosDatabase "$dbName" $cosmosAccountName $resourceGroupName
createCosmosCollection "a11yIssues" "$dbName" $cosmosAccountName $resourceGroupName
createCosmosCollection "webPagesToScan" "$dbName" $cosmosAccountName $resourceGroupName