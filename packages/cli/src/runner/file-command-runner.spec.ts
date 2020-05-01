// // // Copyright (c) Microsoft Corporation. All rights reserved.
// // // Licensed under the MIT License.

// import 'reflect-metadata';

// // import { AxeResults } from 'axe-core';
// import { IMock, Mock, Times, MockBehavior } from 'typemoq';
// // import { ReportDiskWriter } from '../report/report-disk-writer';
// // import { ReportGenerator } from '../report/report-generator';
// // import { AIScanner } from '../scanner/ai-scanner';
// // import { AxeScanResults } from '../scanner/axe-scan-results';
// import { ScanArguments } from '../scanner/scan-arguments';
// import { FileCommandRunner } from './file-command-runner';
// import * as fs from 'fs';

// // tslint:disable: no-empty
// describe('FileCommandRunner', () => {
//     // let scannerMock: IMock<AIScanner>;
//     // let reportGeneratorMock: IMock<ReportGenerator>;
//     // let reportDiskWriterMock: IMock<ReportDiskWriter>;
//     let fsMock: IMock<typeof fs>;
//     // let scanResults: AxeScanResults;
//     let testSubject: FileCommandRunner;
//     // tslint:disable-next-line: no-http-string
//     const testInputFile = 'innput file';
//     // const htmlReportString = 'html report';
//     const testInput: ScanArguments = { inputFile: testInputFile, output: '/users/xyz' };
//     const lines = 'url1 \n url2';
//     // tslint:disable-next-line: mocha-no-side-effect-code
//     beforeEach(() => {
//         // scannerMock = Mock.ofType<AIScanner>();
//         // reportGeneratorMock = Mock.ofType<ReportGenerator>();
//         // reportDiskWriterMock = Mock.ofType<ReportDiskWriter>();
//         fsMock = Mock.ofInstance(fs, MockBehavior.Strict);

        
//         // scanResults = {
//         //     // tslint:disable-next-line: no-object-literal-type-assertion
//         //     results: { url: testUrl } as AxeResults,
//         //     pageTitle: 'page title',
//         //     browserSpec: 'browser version',
//         // };

//         testSubject = new FileCommandRunner(fsMock.object/*, scannerMock.object, reportGeneratorMock.object, reportDiskWriterMock.object*/);
//     });

//     it('Run Command', async () => {
//         // scannerMock
//         //     .setup((sm) => sm.scan(testInput.url))
//         //     .returns(async () => Promise.resolve(scanResults))
//         //     .verifiable(Times.once());
//         // reportGeneratorMock
//         //     .setup((rg) => rg.generateReport(scanResults))
//         //     .returns(() => htmlReportString)
//         //     .verifiable(Times.once());
//         // reportDiskWriterMock
//         //     .setup((rdwm) => rdwm.writeToDirectory(testInput.output, testInput.url, 'html', htmlReportString))
//         //     .verifiable(Times.once());

//         fsMock
//         .setup((fsm) => fsm.readFileSync(testInput.inputFile, 'UTF-8'))
//         .returns(() => lines)
//         .verifiable(Times.once());
                
//         await testSubject.runCommand(testInput);
        
//         fsMock.verifyAll();
//         // scannerMock.verifyAll();
//         // reportGeneratorMock.verifyAll();
//     });
// });
