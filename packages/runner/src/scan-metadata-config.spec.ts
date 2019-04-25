import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { Argv } from 'yargs';
import { ScanMetadataConfig } from './scan-metadata-config';
// tslint:disable: no-any

describe(ScanMetadataConfig, () => {
    let testSubject: ScanMetadataConfig;
    let argvMock: IMock<Argv>;
    const argvVal = { foo: 'test' };

    beforeEach(() => {
        // tslint:disable-next-line: no-empty
        argvMock = Mock.ofInstance<Argv>(({ argv: undefined, demandOption: () => {} } as unknown) as Argv);
        testSubject = new ScanMetadataConfig(argvMock.object);
        argvMock.setup(a => a.argv).returns(() => argvVal as any);
    });

    it('getConfig', () => {
        expect(testSubject.getConfig()).toBe(argvVal);

        argvMock.verify(a => a.demandOption(['websiteId', 'websiteName', 'baseUrl', 'scanUrl', 'serviceTreeId']), Times.once());
    });
});
