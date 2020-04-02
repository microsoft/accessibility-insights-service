// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { GuidGenerator, HashGenerator } from 'common';
import { ItemType } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { PartitionKeyFactory } from './partition-key-factory';

let hashGeneratorMock: IMock<HashGenerator>;
let guidGeneratorMock: IMock<GuidGenerator>;
let partitionKeyFactory: PartitionKeyFactory;

beforeEach(() => {
    hashGeneratorMock = Mock.ofType(HashGenerator);
    guidGeneratorMock = Mock.ofType(GuidGenerator);
    partitionKeyFactory = new PartitionKeyFactory(hashGeneratorMock.object, guidGeneratorMock.object);
});

afterEach(() => {
    guidGeneratorMock.verifyAll();
    hashGeneratorMock.verifyAll();
});

describe(PartitionKeyFactory, () => {
    it('create partition key for the storage document', () => {
        const documentId = 'doc1';
        const partitionKeyResult = 'itemType-10';
        setupGenerators(ItemType.onDemandPageScanRequest, documentId, partitionKeyResult);
        const partitionKey = partitionKeyFactory.createPartitionKeyForDocument(ItemType.onDemandPageScanRequest, documentId);
        expect(partitionKey).toEqual(partitionKeyResult);
    });
});

function setupGenerators(partitionKeyPrefix: string, documentId: string, partitionKey: string): void {
    const scanIdNode = `${documentId}-node`;
    guidGeneratorMock
        .setup((g) => g.getGuidNode(documentId))
        .returns(() => scanIdNode)
        .verifiable();

    hashGeneratorMock
        .setup((h) => h.getDbHashBucket(partitionKeyPrefix, scanIdNode))
        .returns(() => partitionKey)
        .verifiable();
}
