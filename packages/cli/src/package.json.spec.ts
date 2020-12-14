// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { flatten } from 'lodash';
import { listMonorepoPackageNames } from 'common';
import * as packageJson from '../package.json';

describe('package.json dependencies', () => {
    const monorepoPackageNames = listMonorepoPackageNames();
    const isMonorepoPackage = (packageName: string) => monorepoPackageNames.includes(packageName);
    const monorepoDevDependencies = Object.keys(packageJson.devDependencies).filter(isMonorepoPackage);
    const monorepoNonDevDependencies = Object.keys(packageJson.dependencies).filter(isMonorepoPackage);

    // We don't publish other monorepo packages (eg, "common") to npm, so it's important
    // that we only depend on them as devDependencies, not dependencies, to avoid consumers
    // trying to pull down non-published packages.
    it('does not include any direct non-dev dependencies on monorepo packages', () => {
        expect(monorepoNonDevDependencies).toEqual([]);
    });

    // We bundle the other monorepo packages (eg, "common") with what we publish to npm, but
    // we treat as external all node_modules, including those that are only included as transitive
    // dependencies of other monorepo packages. To avoid breaking consumers, that means that we
    // need to repeat those transitive dependencies in our own dependency list; ie, the "cli" dependency
    // list should be a superset of the "common" dependency list.
    it('includes direct dependencies for each non-monorepo dependency of its transitive monorepo dependencies', async () => {
        const actualDirectDependencyNames = Object.keys(packageJson.dependencies);
        const actualDirectDependencies = actualDirectDependencyNames.map((name) => formatDependencyListing(name, packageJson.dependencies));

        const missingDependenciesToResponsibleDependents: { [missingDependency: string]: string[] } = {};
        for (const monorepoDevDependency of monorepoDevDependencies) {
            const expectedNonMonorepoDependencies = await getEdgeNonMonorepoDependencies(monorepoDevDependency);
            const missingDependencies = expectedNonMonorepoDependencies.filter((d) => !actualDirectDependencies.includes(d));
            for (const missingDependency of missingDependencies) {
                if (!missingDependenciesToResponsibleDependents[missingDependency]) {
                    missingDependenciesToResponsibleDependents[missingDependency] = [];
                }
                missingDependenciesToResponsibleDependents[missingDependency].push(monorepoDevDependency);
            }
        }

        const missingDependencyExplanations = Object.keys(missingDependenciesToResponsibleDependents)
            .sort()
            .map((missingDependency) => {
                const responsibleDependents = missingDependenciesToResponsibleDependents[missingDependency].sort();

                return `package.json needs a dependency on ${missingDependency} (required via ${responsibleDependents.join(', ')})`;
            });

        expect(missingDependencyExplanations).toStrictEqual([]);
    });

    function formatDependencyListing(depName: string, dependencies: { [x: string]: string }): string {
        return `${JSON.stringify(depName)}: ${JSON.stringify(dependencies[depName])}`;
    }

    // suppose:
    //   * /packages/monorepo-foo/package.json has dependencies: { "monorepo-bar": "1", "external-a": "2" }
    //   * /packages/monorepo-bar/package.json has dependencies: { "external-b": "3" }
    //   * /node_modules/external-a/package.json has dependencies: { "external-c": "4" }
    //   * external-b and external-c have no dependencies
    //
    // then getEdgeNonMonorepoDependencies('monorepo-foo') returns ['"external-a": "2"', '"external-b": "3"']
    async function getEdgeNonMonorepoDependencies(monorepoPackageName: string): Promise<string[]> {
        const monorepoPackageJson = await import(`${monorepoPackageName}/package.json`);
        const deps: string[] = Object.keys(monorepoPackageJson.dependencies);
        const directNonMonorepoDepNames = deps.filter((d) => !isMonorepoPackage(d));
        const directNonMonorepoDeps = directNonMonorepoDepNames.map((name) =>
            formatDependencyListing(name, monorepoPackageJson.dependencies),
        );
        const directMonorepoDeps = deps.filter(isMonorepoPackage);
        const indirectNonMonorepoDepGroups = await Promise.all(directMonorepoDeps.map(getEdgeNonMonorepoDependencies));
        const edgeNonMonorepoDeps = [...directNonMonorepoDeps, ...flatten(indirectNonMonorepoDepGroups)];
        const dedupedEdgeNonMonorepoDeps = [...new Set(edgeNonMonorepoDeps)];

        return dedupedEdgeNonMonorepoDeps;
    }
});
