// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { HashGenerator } from 'common';
import { ItemType, RunResult } from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';
import { PageObjectFactory } from './page-object-factory';

let hashGeneratorMock: IMock<HashGenerator>;
let pageObjectFactory: PageObjectFactory;

beforeEach(() => {
    hashGeneratorMock = Mock.ofType<HashGenerator>();
    pageObjectFactory = new PageObjectFactory(hashGeneratorMock.object);
});

describe('createImmutableInstance', () => {
    it('create immutable instance', () => {
        const instance = {
            id: 'hash-id',
            itemType: ItemType.page,
            websiteId: 'websiteId',
            baseUrl: 'baseUrl',
            url: 'scanUrl',
            pageRank: <number>undefined,
            lastReferenceSeen: <string>undefined,
            lastRun: <RunResult>undefined,
            links: <[]>undefined,
            partitionKey: 'websiteId',
        };

        hashGeneratorMock
            .setup((b) => b.getWebsitePageDocumentId(instance.baseUrl, instance.url))
            .returns(() => 'hash-id')
            .verifiable(Times.once());

        const resultInstance = pageObjectFactory.createImmutableInstance(instance.websiteId, instance.baseUrl, instance.url);
        expect(resultInstance).toEqual(instance);
        hashGeneratorMock.verifyAll();
    });
});
