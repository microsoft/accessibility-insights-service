const path = require('path');
const shellJs = require('shelljs');
const shellUtils = require('./shell-utils');
const fs = require('fs');

const currentDir = path.resolve(__dirname);
const scannerDir = path.resolve(currentDir, '../');

shellJs.pushd(process.cwd());

try {
    shellUtils.echoCommentBanner('install function dependencies');
    shellJs.cd(path.resolve(scannerDir, 'dist'));
    shellUtils.executeCommand('npx func extensions install');

    shellUtils.echoCommentBanner('building base image');
    shellJs.cd('../');
    shellUtils.executeCommand(`docker build -t scanner .`);

    if (fs.existsSync('./dev-docker/dev.DockerFile')) {
        shellUtils.echoCommentBanner('building dev image');
        shellJs.cd('dev-docker');
        shellUtils.executeCommand(`docker build -t scanner-dev -f dev.DockerFile .`);
    }
} finally {
    shellJs.popd();
}
