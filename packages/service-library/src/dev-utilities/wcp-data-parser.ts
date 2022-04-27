// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import yargs from 'yargs';
import { System, HashGenerator } from 'common';
import * as dotenv from 'dotenv';
import pLimit from 'p-limit';
import { PrivacyPageScanReport, ConsentResult, CookieByDomain, Cookie } from 'storage-documents';
import { isEmpty } from 'lodash';
import { PrivacyMetadata, UrlValidation, ViolationTypeEnum } from './wcp-types';
import { downloadBlob, writeToFile, executeBatchInChunkExclusive } from './common-lib';

/* eslint-disable @typescript-eslint/no-explicit-any, security/detect-non-literal-fs-filename */

type ClientOperation = 'compare-validation' | 'get-validation';
type MissingFromReport = 'accessibility' | 'privacy';

interface ClientArgs {
    operation: ClientOperation;
    azureTenantId: string;
    azureClientId: string;
    azureClientSecret: string;
    dataFolder: string;
    metadataFile: string;
    azureStorageName: string;
    azureStorageKey: string;
    azureBlobContainerName: string;
}

interface CookieMismatch {
    missingFrom: MissingFromReport;
    name: string;
    domain: string;
}

interface ValidationDiff {
    url: string;
    fileHash: string;
    bannerDetectionMismatch: boolean;
    cookieMismatch: CookieMismatch[];
}

const maxConcurrencyLimit = 10;

let clientArgs: ClientArgs;
const hashGenerator = new HashGenerator();
const getDataFolderName = () => `${__dirname}/${clientArgs.dataFolder}`;
const getMetadataFileName = () => `${getDataFolderName()}/${clientArgs.metadataFile}`;
const getFilePath = (fileName: string) => `${getDataFolderName()}/${fileName}`;

async function main(): Promise<void> {
    clientArgs = getClientArguments();
    cleanup();
    await dispatchOperation();
}

async function dispatchOperation(): Promise<void> {
    switch (clientArgs.operation) {
        case 'get-validation':
            await exportPrivacyValidation();
            break;
        case 'compare-validation':
            await comparePrivacyValidation();
            break;
        default:
            throw new Error(`Operation ${clientArgs.operation} is not supported.`);
    }
}

async function comparePrivacyValidation(): Promise<void> {
    const fn = (validations: string[]) => {
        return Promise.resolve(validations.map(comparePrivacyValidationImpl));
    };

    const wcpValidationList = getPrivacyValidationList();
    await executeBatchInChunkExclusive(fn, wcpValidationList);
}

function comparePrivacyValidationImpl(wcpValidationFileName: string): void {
    const wcpValidation = readValidationReportFile(wcpValidationFileName);
    const urlHash = hashGenerator.generateBase64Hash(wcpValidation.seedUri);
    const aiValidationFileName = `${urlHash}.ai.report.json`;
    const aiValidation = readValidationReportFile(aiValidationFileName);
    if (aiValidation === undefined) {
        console.log(`The AI validation report file not found. File: ${aiValidationFileName} URL: ${wcpValidation.seedUri}`);
    } else {
        const cookieDiff = getCookieDiff(aiValidation, wcpValidation);
        if (cookieDiff.length > 0 || aiValidation.bannerDetected !== wcpValidation.bannerDetected) {
            const validationDiff = {
                url: wcpValidation.seedUri,
                fileHash: urlHash,
                bannerDetectionMismatch: aiValidation.bannerDetected !== wcpValidation.bannerDetected,
                cookieMismatch: cookieDiff,
            } as ValidationDiff;

            writeToFile(validationDiff, getDataFolderName(), `${urlHash}.diff`);
        }
        console.log(`Compared website validation for ${wcpValidation.seedUri}`);
    }
}

function getCookieDiff(aiReport: PrivacyPageScanReport, wcpReport: PrivacyPageScanReport): CookieMismatch[] {
    const getAllCookie = (source: PrivacyPageScanReport): Cookie[] => {
        const allCookie: Cookie[] = [];
        if (source.cookieCollectionConsentResults) {
            source.cookieCollectionConsentResults.map((cookie) => {
                if (cookie.cookiesBeforeConsent) {
                    cookie.cookiesBeforeConsent.map((d) => {
                        if (d.cookies) {
                            allCookie.push(...d.cookies);
                        }
                    });
                }
                if (cookie.cookiesAfterConsent) {
                    cookie.cookiesAfterConsent.map((d) => {
                        if (d.cookies) {
                            allCookie.push(...d.cookies);
                        }
                    });
                }
            });
        }

        return allCookie;
    };

    const aiReportCookie = getAllCookie(aiReport);
    const wcpReportCookie = getAllCookie(wcpReport);
    const missingCookieFromAi = wcpReportCookie
        .filter((w) => !aiReportCookie.some((a) => normalizeDomain(a.domain) === normalizeDomain(w.domain) && a.name === w.name))
        .map((r) => {
            return {
                missingFrom: 'accessibility',
                domain: r.domain,
                name: r.name,
            } as CookieMismatch;
        });
    const missingCookieFromWcp = aiReportCookie
        .filter((w) => !wcpReportCookie.some((a) => normalizeDomain(a.domain) === normalizeDomain(w.domain) && a.name === w.name))
        .map((r) => {
            return {
                missingFrom: 'privacy',
                domain: r.domain,
                name: r.name,
            } as CookieMismatch;
        });

    return [...missingCookieFromAi, ...missingCookieFromWcp];
}

function normalizeDomain(domain: string): string {
    if (isEmpty(domain)) {
        return domain;
    }

    let domainFixed = domain;
    if (domain.startsWith('www')) {
        domainFixed = domain.slice(domain.indexOf('.') + 1);
    } else {
        domainFixed = domain.startsWith('.') ? domain.slice(1) : domain;
    }

    return domainFixed;
}

async function exportPrivacyValidation(): Promise<void> {
    const privacyMetadata = readMetadataFile();
    await parsePrivacyMetadata(privacyMetadata);
}

async function parsePrivacyMetadata(privacyMetadata: PrivacyMetadata[]): Promise<void> {
    const asyncLimit = pLimit(maxConcurrencyLimit);
    await Promise.all(
        await asyncLimit(async () => {
            return privacyMetadata.map(async (metadata) => {
                try {
                    const urlValidation = await downloadPrivacyBlob(metadata.ValidationResultBlobName);
                    appendUrlToList(urlValidation);
                    writeUrlValidation(urlValidation);
                    console.log(`Parsed website validation for '${metadata.Name}'`);
                } catch (error) {
                    console.log('Error while parsing privacy metadata: ', System.serializeError(error));
                }
            });
        }),
    );
}

async function downloadPrivacyBlob(blobName: string): Promise<UrlValidation[]> {
    const blob = await downloadBlob<UrlValidation[]>(
        clientArgs.azureStorageName,
        clientArgs.azureBlobContainerName,
        blobName,
        clientArgs.azureStorageKey,
    );
    if (blob === undefined) {
        console.log(`The blob '${blobName}' not found.`);

        return undefined;
    }

    return blob;
}

function appendUrlToList(urlValidation: UrlValidation[]): void {
    if (!fs.existsSync(getDataFolderName())) {
        fs.mkdirSync(getDataFolderName());
    }

    const filePath = `${getDataFolderName()}/urls.txt`;
    urlValidation.map((validation) => {
        fs.appendFileSync(filePath, `${validation.Url}\n`);
    });
}

function readMetadataFile(): PrivacyMetadata[] {
    if (!fs.existsSync(getMetadataFileName())) {
        console.log(`File not found ${getMetadataFileName()}`);

        return [];
    }

    return JSON.parse(fs.readFileSync(getMetadataFileName(), { encoding: 'utf-8' })) as PrivacyMetadata[];
}

function writeUrlValidation(urlValidation: UrlValidation[]): void {
    urlValidation.map((validation) => {
        const urlHash = hashGenerator.generateBase64Hash(validation.Url);
        writeToFile(validation, getDataFolderName(), `${urlHash}.wcp.validation`);

        const privacyPageScanReport = convertToPrivacyPageScanReport(validation);
        writeToFile(privacyPageScanReport, getDataFolderName(), `${urlHash}.wcp.report`);
    });
}

function convertToPrivacyPageScanReport(urlValidation: UrlValidation): PrivacyPageScanReport {
    interface ConsentResultByKey {
        key: string;
        consentResult: ConsentResult;
    }
    const consentResult: ConsentResultByKey[] = [];

    urlValidation.CookieValidations.map((cookieValidation) => {
        const cookie: CookieByDomain = {
            domain: cookieValidation.ScanCookie.Domain,
            cookies: [
                {
                    name: cookieValidation.ScanCookie.Name,
                    domain: cookieValidation.ScanCookie.Domain,
                },
            ],
        };

        const key = `${cookieValidation.ScanCookie.Domain}:${cookieValidation.ScanCookie.Name}:${cookieValidation.ViolationType}`;
        if (!consentResult.some((r) => r.key === key)) {
            consentResult.push({
                key,
                consentResult: {
                    violation: ViolationTypeEnum[cookieValidation.ViolationType as number] as string,
                    cookiesAfterConsent: [cookie],
                } as ConsentResult,
            });
        }
    });

    return {
        navigationalUri: urlValidation.Url,
        seedUri: urlValidation.Url,
        finishDateTime: new Date(),
        bannerDetectionXpathExpression: urlValidation.BannerXPath,
        bannerDetected: urlValidation.BannerStatus === 1,
        httpStatusCode: urlValidation.HttpStatusCode,
        cookieCollectionConsentResults: consentResult.map((r) => r.consentResult),
    };
}

function readValidationReportFile(fileName: string): PrivacyPageScanReport {
    const filePath = getFilePath(fileName);
    if (!fs.existsSync(filePath)) {
        console.log(`The validation report file not found: ${filePath}`);

        return undefined;
    }

    return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' })) as PrivacyPageScanReport;
}

function getPrivacyValidationList(): string[] {
    if (!fs.existsSync(getDataFolderName())) {
        console.log(`Folder not found ${getDataFolderName()}`);

        return [];
    }

    const dataFiles = fs.readdirSync(getDataFolderName());

    return dataFiles.filter((f) => f.endsWith('.wcp.report.json'));
}

function cleanup(): void {
    const filePath = `${getDataFolderName()}/urls.txt`;
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

function getClientArguments(): ClientArgs {
    return yargs
        .env()
        .wrap(yargs.terminalWidth())
        .options({
            operation: {
                type: 'string',
                describe: 'The parser operation.',
            },
            azureTenantId: {
                type: 'string',
                describe: 'The Azure tenant id.',
                alias: ['azuretenantid', 'azure-tenant-id', 'wcp-azure-tenant-id'],
                coerce: (arg) => {
                    process.env.AZURE_TENANT_ID = arg;

                    return arg;
                },
            },
            azureClientId: {
                type: 'string',
                describe: 'The Azure client id.',
                alias: ['azureclientid', 'azure-client-id', 'wcp-azure-client-id'],
                coerce: (arg) => {
                    process.env.AZURE_CLIENT_ID = arg;

                    return arg;
                },
            },
            azureClientSecret: {
                type: 'string',
                describe: 'The Azure client secret.',
                alias: ['azureclientsecret', 'azure-client-secret', 'wcp-azure-client-secret'],
                coerce: (arg) => {
                    process.env.AZURE_CLIENT_SECRET = arg;

                    return arg;
                },
            },
            dataFolder: {
                type: 'string',
                describe: 'The data folder relative location.',
                default: './data',
                alias: ['datafolder', 'data-folder'],
            },
            metadataFile: {
                type: 'string',
                describe: 'The file with privacy scan metadata data.',
                alias: ['metadatafile', 'metadata-file', 'privacy-metadata-file'],
            },
            azureStorageName: {
                type: 'string',
                describe: 'The privacy storage name.',
                alias: ['azurestoragename', 'wcp-azure-storage-name'],
            },
            azureStorageKey: {
                type: 'string',
                describe: 'The Azure storage access key.',
                alias: ['azurestoragekey', 'azure-storage-key', 'wcp-azure-storage-key'],
            },
            azureBlobContainerName: {
                type: 'string',
                describe: 'The privacy blob container name.',
                alias: ['azureblobcontainername', 'wcp-azure-blob-container-name'],
            },
        })
        .describe('help', 'Show help').argv as unknown as ClientArgs;
}

(async () => {
    dotenv.config();
    await main();
})().catch((error) => {
    console.log('Exception occurred while running the tool: ', System.serializeError(error));
    process.exitCode = 1;
});
