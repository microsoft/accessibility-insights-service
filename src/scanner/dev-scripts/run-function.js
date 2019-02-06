const shellJs = require('shelljs');
const shellUtils = require('./shell-utils');

shellJs.pushd(process.cwd());

try {
    shellUtils.echoCommentBanner('killing running dev container');
    shellUtils.executeCommand('docker rm -f scanner-dev-container', { doNotThrow: true });

    shellUtils.echoCommentBanner('running dev container');
    shellUtils.executeCommand('docker run --name scanner-dev-container -p 8080:80 --rm scanner-dev');
} finally {
    shellJs.popd();
}
