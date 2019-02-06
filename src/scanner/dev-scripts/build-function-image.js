const path = require('path');
const shellJs = require('shelljs');
const shellUtils = require('./shell-utils');

const currentDir = path.resolve(__dirname);
const scannerDir = path.resolve(currentDir, '../');

shellJs.pushd(process.cwd());

try {
    shellUtils.echoCommentBanner('install function dependencies');
    shellJs.cd(path.resolve(scannerDir, 'dist'));
    shellUtils.executeCommand('func extensions install');

    shellUtils.echoCommentBanner('building base image');
    shellJs.cd('../');
    shellUtils.executeCommand(`docker build -t scanner .`);

    shellUtils.echoCommentBanner('building dev image');
    shellJs.cd('dev-docker');
    shellUtils.executeCommand(`docker build -t scanner-dev -f dev.DockerFile .`);
} finally {
    shellJs.popd();
}
