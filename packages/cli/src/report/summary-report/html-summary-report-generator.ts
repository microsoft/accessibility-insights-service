// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as escapeHtml from 'escape-html';
import { injectable } from 'inversify';
import { SummaryReportData, UrlToReportMap } from './summary-report-data';
import { SummaryReportGenerator } from './summary-report-generator';

// tslint:disable-next-line: no-var-requires no-require-imports no-unsafe-any
const pretty: (html: string) => string = require('pretty');

type HtmlSummaryLink = {
    link: string;
    fileName: string;
};

type HtmlSummaryData = {
    passedLinks: HtmlSummaryLink[];
    failedLinks: HtmlSummaryLink[];
};

@injectable()
export class HtmlSummaryReportGenerator implements SummaryReportGenerator {
    public generateReport(summaryReportData: SummaryReportData): string {
        const htmlSummaryData: HtmlSummaryData = {
            failedLinks: [],
            passedLinks: [],
        };

        htmlSummaryData.failedLinks = this.getHtmlLinkData(summaryReportData.failedUrlToReportMap);
        htmlSummaryData.passedLinks = this.getHtmlLinkData(summaryReportData.passedUrlToReportMap);

        return pretty(`
        <!DOCTYPE html>
        <html lang='en'>
            <head>
                <meta charset="UTF-8">
                <title>Accessibility Insights Summary Report</title>
            </head>
            <body>
                ${this.getHtmlBody(htmlSummaryData)}
            </body>
        </html>
        `);
    }

    private getHtmlBody(htmlSummaryData: HtmlSummaryData): string {
        const totalUrlsScannedInfo = `
        <b>
            Total Urls Scanned - ${htmlSummaryData.failedLinks.length + htmlSummaryData.passedLinks.length}
        </b>
        `;
        if (htmlSummaryData.failedLinks.length === 0 && htmlSummaryData.passedLinks.length === 0) {
            return totalUrlsScannedInfo;
        }

        return `
        ${totalUrlsScannedInfo}
        <ul>
            ${this.getFailedLinksHtml(htmlSummaryData)}
            ${this.getPassedLinksHtml(htmlSummaryData)}
        </ul>`;
    }

    private getFailedLinksHtml(htmlSummaryData: HtmlSummaryData): string {
        if (htmlSummaryData.failedLinks.length === 0) {
            return '';
        }

        return this.getLinksSection('Failed Urls', htmlSummaryData.failedLinks);
    }

    private getPassedLinksHtml(htmlSummaryData: HtmlSummaryData): string {
        if (htmlSummaryData.passedLinks.length === 0) {
            return '';
        }

        return this.getLinksSection('Passed Urls', htmlSummaryData.passedLinks);
    }

    private getLinksSection(sectionName: string, links: HtmlSummaryLink[]): string {
        return `
        <li>
            ${sectionName}
            <ul>
                ${this.getHtmlLinks(links)}
            </ul>
        </li>`;
    }

    private getHtmlLinks(links: HtmlSummaryLink[]): string {
        const htmlLinks: string[] = links.map((item) => {
            return `
            <li>
                <a href='${item.link}'>${escapeHtml(item.fileName)}</a>
            </li>`;
        });

        return htmlLinks.join('\n');
    }

    private getHtmlLinkData(urlMap: UrlToReportMap): HtmlSummaryLink[] {
        const links: HtmlSummaryLink[] = [];

        for (const url of Object.keys(urlMap)) {
            links.push({
                fileName: url,
                link: urlMap[url],
            });
        }

        return links;
    }
}
