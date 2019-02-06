const inquirer = require('inquirer');
const shellJs = require('shelljs');
const shellUtils = require('./shell-utils');

async function deployToProd() {
    shellUtils.echoCommentBanner('Log in to container registry');
    const dockerId = await getDockerId();
    await loginToDocker(dockerId);

    shellUtils.echoCommentBanner(`Performing clean build`);
    shellUtils.executeCommand('npm run cbuild');

    shellUtils.echoCommentBanner(`Building container image`);
    shellUtils.executeCommand('npm run build-image');

    shellUtils.echoCommentBanner(`Tagging local container to ${dockerId}`);
    shellUtils.executeCommand(`docker tag scanner ${dockerId}/scanner`);

    shellUtils.echoCommentBanner(`Pushing container to ${dockerId}`);
    shellUtils.executeCommand(`docker push ${dockerId}/scanner`);
}

async function loginToDocker(dockerId) {
    if (shellUtils.executeCommand(`docker login ${dockerId}`, { doNotThrow: true }) !== 0) {
        shellJs.echo('\n Login credentials not found / expired. Enter credentials:\n');

        const { userName, password } = await getDockerCredentials();
        shellUtils.executeCommand(`echo | set /p="${password}" | docker login ${dockerId} --username ${userName} --password-stdin`, {
            doNotLogCommand: false,
        });
    }
}

async function getDockerId() {
    const questions = [
        {
            name: 'dockerId',
            type: 'input',
            message: "Container registry's login server. (You can find this under Access Keys section in portal) -",
        },
    ];
    const userInputs = await inquirer.prompt(questions);
    return userInputs.dockerId;
}

async function getDockerCredentials() {
    const questions = [
        {
            name: 'userName',
            type: 'input',
            message: "Container registry's user name. (You can find this under Access Keys section in portal. Enable admin user) -",
        },
        {
            name: 'password',
            type: 'password',
            message: "Container registry's password. (You can find this under Access Keys section in portal. Enable admin user) -",
        },
    ];
    return await inquirer.prompt(questions);
}

deployToProd();
