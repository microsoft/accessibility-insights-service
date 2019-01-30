const puppeteerCore = require('puppeteer-core');
const puppeteerCorePackage = require('puppeteer-core/package.json');
const fs = require('fs');

const downloadPath = `${__dirname}/../dist/scan-url/.local-chromium`;

const browserFetcher = puppeteerCore.createBrowserFetcher({
    platform: 'win32',
    path: downloadPath,
});

async function downloadChrome() {
    const version = puppeteerCorePackage.puppeteer.chromium_revision;
    console.log(`Downloading version ${version}`);
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
    }

    const revisionInfo = browserFetcher.revisionInfo(version);
    console.log('revision info', revisionInfo);
    if (!revisionInfo.local) {
        process.stdout.write('Downloading chrome');
        await browserFetcher.download(revisionInfo.revision, onDownloadProgress);
        console.log('\nChrome is downloaded successfully');
    } else {
        console.log('Chrome is already downloaded');
    }
}

let downloadProgressBarCount = 0;
function onDownloadProgress(downloadedBytes, totalBytes) {
    const currentProgressCount = Math.floor((downloadedBytes / totalBytes) * 10);

    if (currentProgressCount != downloadProgressBarCount) {
        process.stdout.write('.');
        downloadProgressBarCount = currentProgressCount;
    }
}
downloadChrome();
