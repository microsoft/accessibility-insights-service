const shellJs = require('shelljs');

module.exports = {
    echoCommentBanner: function(comment) {
        shellJs.echo(`##############  ${comment}  ##############\n\n`);
    },
    executeCommand: function(command, config = { doNotThrow: false, doNotLogCommand: false }) {
        const process = shellJs.exec(command);
        if (process.code !== 0) {
            const errorMessage = `command - "${config.doNotLogCommand ? '' : command}" failed with exit code ${process.code}`;
            if (!config.doNotThrow) {
                throw new Error(errorMessage);
            }

            console.log(errorMessage);
        }
        return process.code;
    },
};
