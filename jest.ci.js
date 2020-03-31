// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const glob = require('glob');
const config = require('./jest.config');
const yargs = require('yargs');
let projects = [];

function getTestProjects() {
    yargs.demandOption(['totalTestSlices', 'testSlicesToRun']);

    let allProjects = glob.sync('packages/*/jest.config.js');
    const totalTestSlices = yargs.argv.totalTestSlices;
    const testSlicesToRun = JSON.parse(yargs.argv.testSlicesToRun);

    console.log('totalTestSlices = ', totalTestSlices);
    console.log('testSlicesToRun = ', testSlicesToRun);

    allProjects = allProjects.sort();
    allProjects.forEach((value, index) => {
        const slice = index % totalTestSlices;
        if (testSlicesToRun.includes(slice)) {
            projects.push(value);
        }
    });
}

getTestProjects();

console.log('project files - ', projects);
module.exports = {
    ...config,
    projects: projects,
};
