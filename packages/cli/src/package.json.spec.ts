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
    it.each(monorepoDevDependencies)("is a superset of %s's dependencies", async (monrepoPackageName) => {
        const edgeNonMonorepoDependencies = await getEdgeNonMonorepoDependencies(monrepoPackageName);
        const directDependencies = Object.keys(packageJson.dependencies);
        for (const edgeNonMonorepoDependency of edgeNonMonorepoDependencies) {
            expect(directDependencies).toContain(edgeNonMonorepoDependency);
        }
    });

    // suppose:
    //   * /packages/monorepo-foo/package.json has dependencies: { 'monorepo-bar': '*', 'external-a': '*' }
    //   * /packages/monorepo-bar/package.json has dependencies: { 'external-b': '*' }
    //   * /node_modules/external-a/package.json has dependencies: { 'external-c': '*' }
    //   * external-b and external-c have no dependencies
    //
    // then getEdgeNonMonorepoDependencies('monorepo-foo') returns ['external-a', 'external-b']
    async function getEdgeNonMonorepoDependencies(monorepoPackageName: string): Promise<string[]> {
        const monorepoPackageJson = await import(`${monorepoPackageName}/package.json`);
        const deps: string[] = Object.keys(monorepoPackageJson.dependencies);
        const directNonMonorepoDeps = deps.filter(d => !isMonorepoPackage(d));
        const directMonorepoDeps = deps.filter(isMonorepoPackage);
        const indirectNonMonorepoDepGroups = await Promise.all(directMonorepoDeps.map(getEdgeNonMonorepoDependencies));

        return [
            ...directNonMonorepoDeps,
            ...flatten(indirectNonMonorepoDepGroups),
        ];
    }
});
