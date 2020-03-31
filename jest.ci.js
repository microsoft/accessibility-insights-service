// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const glob = require('glob');
const config = require('./jest.config');
const yargs = require('yargs');
let projects = [];

function getTestProjects() {
    yargs.demandOption(['totalSlices', 'slicesToRun']);

    let allProjects = glob.sync('packages/*/jest.config.js');
    const totalSlices = yargs.argv.totalSlices;
    const slicesToRun = JSON.parse(yargs.argv.slicesToRun);

    console.log('totalSlices = ', totalSlices);
    console.log('slicesToRun = ', slicesToRun);

    allProjects = allProjects.sort();
    allProjects.forEach((value, index) => {
        const slice = index % totalSlices;
        if (slicesToRun.includes(slice)) {
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
