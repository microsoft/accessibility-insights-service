// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import yargs from 'yargs';
import { System, HashGenerator } from 'common';
import * as dotenv from 'dotenv';
import pLimit from 'p-limit';
import { PrivacyPageScanReport, CookieByDomain, Cookie, ConsentResult } from 'storage-documents';
import { isEmpty, clone } from 'lodash';
import * as nodeFetch from 'node-fetch';
import { PrivacyMetadata, PrivacyValidationResult, CookieCollectionUrlResult, CookiesSession } from './wcp-types';
import {
    writeToFile,
    executeBatchInChunkExclusive,
    createGetHttpRequestForWebsec,
    executeWithExpRetry,
    ensureHttpResponse,
} from './common-lib';

/* eslint-disable @typescript-eslint/no-explicit-any, security/detect-non-literal-fs-filename */

type ClientOperation = 'compare-validation' | 'get-validation';
type MissingFromReport = 'accessibility' | 'websec';
type ScenarioStep = 'beforeConsent' | 'afterConsent';

interface ClientArgs {
    operation: ClientOperation;
    dataFolder: string;
    metadataFile: string;
    azureStorageName: string;
    azureStorageKey: string;
    azureBlobContainerName: string;
    websecAppKey: string;
    privacyServiceBaseUrl: string;
}

interface ReportMismatch {
    url: string;
    fileHash: string;
    bannerDetectionMismatch: boolean;
    scenariosMismatch: ScenarioMismatch[];
}

interface ScenarioMismatch {
    scenario: string;
    isMissing?: boolean;
    cookiesMismatch?: CookieMismatch[];
}

interface CookieMismatch {
    missingFrom: MissingFromReport;
    step: ScenarioStep;
    name: string;
    domain: string;
}

const maxConcurrencyLimit = 10;

let clientArgs: ClientArgs;
const hashGenerator = new HashGenerator();
const getDataFolderName = () => `${__dirname}/${clientArgs.dataFolder}`;
const getMetadataFileName = () => `${getDataFolderName()}/${clientArgs.metadataFile}`;
const getFilePath = (fileName: string) => `${getDataFolderName()}/${fileName}`;
const getPrivacyValidationUrl = (link: string) => {
    const segments = link.split('/');
    const id = segments[segments.length - 1];

    return new URL(`${clientArgs.privacyServiceBaseUrl}/${id}`);
};

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

let totalReports = 0;
let mismatchReports = 0;
async function comparePrivacyValidation(): Promise<void> {
    const fn = (validations: string[]) => {
        return Promise.resolve(validations.map(comparePrivacyValidationImpl));
    };

    const wcpValidationList = getPrivacyValidationList();
    await executeBatchInChunkExclusive(fn, wcpValidationList);
    console.log(`Total Reports: ${totalReports}, Mismatch Reports: ${mismatchReports}`);
}

function comparePrivacyValidationImpl(wcpValidationFileName: string): void {
    const websecReport = readValidationReportFile(wcpValidationFileName);
    const urlHash = hashGenerator.generateBase64Hash(websecReport.seedUri);
    const aiReportFileName = `${urlHash}.ai.report.json`;
    const aiReport = readValidationReportFile(aiReportFileName);
    if (aiReport === undefined) {
        console.log(`The AI validation report file not found. File: ${aiReportFileName} URL: ${websecReport.seedUri}`);
    } else {
        totalReports++;
        const reportMismatch = comparePrivacyReport(websecReport, aiReport);
        if (
            reportMismatch.scenariosMismatch.map((s) => s.cookiesMismatch).flat().length > 0 ||
            reportMismatch.bannerDetectionMismatch === true
        ) {
            mismatchReports++;
            reportMismatch.fileHash = aiReportFileName;
            writeToFile(reportMismatch, getDataFolderName(), `${urlHash}.diff`);
            writeStatFile(reportMismatch);
        }
        console.log(`Compared website validation for ${websecReport.seedUri}`);
    }
}

function writeStatFile(reportMismatch: ReportMismatch): void {
    const uniqueCookies = flatCookieMismatch(reportMismatch);
    const missingCookies = uniqueCookies.filter((c) => c.missingFrom === 'accessibility');
    const newCookies = uniqueCookies.filter((c) => c.missingFrom === 'websec');

    // URL BannerDetectionMismatch NewCookies MissingCookies FileName
    const headerLine = `URL\tBannerDetectionMismatch\tNewCookies\tMissingCookies\tFileName`;
    const fileLine = `${reportMismatch.url}\t${reportMismatch.bannerDetectionMismatch}\t${newCookies.length}\t${missingCookies.length}\t${reportMismatch.fileHash}`;

    const filePath = `${getDataFolderName()}/!reportComparison.txt`;
    if (!fs.existsSync(getDataFolderName())) {
        fs.mkdirSync(getDataFolderName());
    }
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `${headerLine}\n`);
    }
    fs.appendFileSync(filePath, `${fileLine}\n`);
}

function flatCookieMismatch(reportMismatch: ReportMismatch): CookieMismatch[] {
    const allCookies = reportMismatch.scenariosMismatch
        .map((scenario) =>
            scenario.cookiesMismatch.map((c) => {
                return { ...c, key: `${c.domain}:${c.name}:${c.missingFrom}` };
            }),
        )
        .flat();

    const key = 'key';
    const uniqueCookies = [...new Map(allCookies.map((item) => [item[key], item])).values()];

    return uniqueCookies;
}

function comparePrivacyReport(websecReport: PrivacyPageScanReport, aiReport: PrivacyPageScanReport): ReportMismatch {
    const scenariosMismatch = websecReport.cookieCollectionConsentResults.map((websecScenario) => {
        return compareScenario(websecScenario, aiReport.cookieCollectionConsentResults);
    });

    return {
        url: websecReport.seedUri,
        fileHash: '',
        bannerDetectionMismatch: websecReport.bannerDetected !== aiReport.bannerDetected,
        scenariosMismatch,
    };
}

function compareScenario(websecConsentResult: ConsentResult, aiConsentResults: ConsentResult[]): ScenarioMismatch {
    const aiConsentResult = aiConsentResults.find((r) => r.cookiesUsedForConsent === websecConsentResult.cookiesUsedForConsent);
    if (aiConsentResult === undefined) {
        return {
            scenario: websecConsentResult.cookiesUsedForConsent,
            isMissing: true,
        };
    }

    const cookieMismatchBeforeConsent = compareCookies(
        'beforeConsent',
        websecConsentResult.cookiesBeforeConsent,
        aiConsentResult.cookiesBeforeConsent,
    );
    const cookieMismatchAfterConsent = compareCookies(
        'afterConsent',
        websecConsentResult.cookiesAfterConsent,
        aiConsentResult.cookiesAfterConsent,
    );

    return {
        scenario: websecConsentResult.cookiesUsedForConsent,
        cookiesMismatch: [...cookieMismatchBeforeConsent, ...cookieMismatchAfterConsent],
    };
}

function compareCookies(
    scenarioStep: ScenarioStep,
    websecReportCookie: CookieByDomain[],
    aiReportCookie: CookieByDomain[],
): CookieMismatch[] {
    const websecReportCookieFlat = flatCookieByDomain(websecReportCookie);
    const aiReportCookieFlat = flatCookieByDomain(aiReportCookie);

    const missingCookieFromAi = websecReportCookieFlat
        .filter((w) => !aiReportCookieFlat.some((a) => normalizeDomain(a.domain) === normalizeDomain(w.domain) && a.name === w.name))
        .map((r) => {
            return {
                missingFrom: 'accessibility',
                step: scenarioStep,
                domain: r.domain,
                name: r.name,
            } as CookieMismatch;
        });
    const missingCookieFromWebsec = aiReportCookieFlat
        .filter((w) => !websecReportCookieFlat.some((a) => normalizeDomain(a.domain) === normalizeDomain(w.domain) && a.name === w.name))
        .map((r) => {
            return {
                missingFrom: 'websec',
                step: scenarioStep,
                domain: r.domain,
                name: r.name,
            } as CookieMismatch;
        });

    return [...missingCookieFromAi, ...missingCookieFromWebsec];
}

function flatCookieByDomain(cookieByDomain: CookieByDomain[]): Cookie[] {
    return cookieByDomain
        .map((d) => {
            return d.cookies;
        })
        .flat();
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
    const fn = (metadata: PrivacyMetadata[]) => {
        return downloadPrivacyValidationResult(metadata);
    };

    const privacyMetadata = readPrivacyMetadataFile();
    await executeBatchInChunkExclusive(fn, privacyMetadata);
}

async function downloadPrivacyValidationResult(privacyMetadata: PrivacyMetadata[]): Promise<void> {
    const asyncLimit = pLimit(maxConcurrencyLimit);
    await Promise.all(
        await asyncLimit(async () => {
            return privacyMetadata.map(async (metadata) => {
                try {
                    const validationResult = await sendGetPrivacyValidationResult(metadata.ScanResultLink, clientArgs.websecAppKey);
                    appendUrlToList(validationResult.CookieCollectionUrlResults);
                    writeUrlValidation(validationResult);
                    console.log(`Parsed website validation for '${metadata.Name}'`);
                } catch (error) {
                    console.log('Error while parsing privacy metadata: ', System.serializeError(error));
                }
            });
        }),
    );
}

async function sendGetPrivacyValidationResult(link: string, appKey: string): Promise<PrivacyValidationResult> {
    const httpRequest = createGetHttpRequestForWebsec(appKey);
    const httpResponse = await executeWithExpRetry<nodeFetch.Response>(async () =>
        nodeFetch.default(getPrivacyValidationUrl(link), httpRequest),
    );
    await ensureHttpResponse(httpResponse);
    const body = await httpResponse.json();

    return body;
}

function appendUrlToList(cookieCollectionUrlResults: CookieCollectionUrlResult[]): void {
    if (!fs.existsSync(getDataFolderName())) {
        fs.mkdirSync(getDataFolderName());
    }

    const filePath = `${getDataFolderName()}/urls.txt`;
    cookieCollectionUrlResults.map((validation) => {
        fs.appendFileSync(filePath, `${validation.SeedUri}\n`);
    });
}

function readPrivacyMetadataFile(): PrivacyMetadata[] {
    if (!fs.existsSync(getMetadataFileName())) {
        console.log(`File not found ${getMetadataFileName()}`);

        return [];
    }

    return JSON.parse(fs.readFileSync(getMetadataFileName(), { encoding: 'utf-8' })) as PrivacyMetadata[];
}

function writeUrlValidation(privacyValidationResult: PrivacyValidationResult): void {
    const privacyValidationResultClone = clone(privacyValidationResult);

    privacyValidationResult.CookieCollectionUrlResults.map((validation) => {
        privacyValidationResultClone.CookieCollectionUrlResults = [validation];
        const urlHash = hashGenerator.generateBase64Hash(validation.SeedUri);
        writeToFile(privacyValidationResultClone, getDataFolderName(), `${urlHash}.wcp.validation`);

        const privacyPageScanReport = convertToPrivacyPageScanReport(validation, privacyValidationResultClone);
        writeToFile(privacyPageScanReport, getDataFolderName(), `${urlHash}.wcp.report`);
    });
}

function convertToPrivacyPageScanReport(
    cookieCollectionUrlResult: CookieCollectionUrlResult,
    privacyValidationResult: PrivacyValidationResult,
): PrivacyPageScanReport {
    const getCookieByDomain = (cookiesSessions: CookiesSession[]): CookieByDomain[] => {
        return cookiesSessions.map((cookie) => {
            return {
                domain: cookie.Domain,
                cookies: cookie.Cookies.map((c) => {
                    return {
                        name: c.Name,
                        domain: c.Domain,
                        expires: c.Expires,
                    };
                }),
            };
        });
    };

    const cookieCollectionConsentResults = cookieCollectionUrlResult.CookieCollectionConsentResults.map((scenario) => {
        return {
            cookiesUsedForConsent: scenario.CookiesUsedForConsent,
            cookiesBeforeConsent: getCookieByDomain(scenario.CookiesBeforeConsent),
            cookiesAfterConsent: getCookieByDomain(scenario.CookiesAfterConsent),
        };
    });

    return {
        navigationalUri: cookieCollectionUrlResult.NavigationalUri,
        seedUri: cookieCollectionUrlResult.SeedUri,
        finishDateTime: privacyValidationResult.FinishDateTime,
        bannerDetectionXpathExpression: cookieCollectionUrlResult.BannerDetectionXpathExpression,
        bannerDetected: cookieCollectionUrlResult.BannerDetected,
        httpStatusCode: cookieCollectionUrlResult.HttpStatusCode,
        cookieCollectionConsentResults,
        geolocation: {
            ip: privacyValidationResult.Geolocation.IP,
            countryName: privacyValidationResult.Geolocation.CountryName,
            regionName: privacyValidationResult.Geolocation.RegionName,
            city: privacyValidationResult.Geolocation.City,
            isInEuropeanUnion: privacyValidationResult.Geolocation.IsInEuropeanUnion,
        },
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
            websecAppKey: {
                type: 'string',
                describe: 'The websec app key.',
                alias: ['websecappkey', 'websec-app-key'],
            },
            privacyServiceBaseUrl: {
                type: 'string',
                describe: 'The privacy service base URL.',
                alias: ['privacyservicebaseurl', 'privacy-service-base-url'],
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
