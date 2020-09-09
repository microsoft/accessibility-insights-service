// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { IMock, Mock, Times } from 'typemoq';
import { ReportNameGenerator } from './report-name-generator';
import { ReportNameGeneratorBuilder } from './report-name-generator-builder';

describe('UnifiedReportNameGenerator', () => {
    const theBase = 'BASE';
    const theDate = new Date();

    const dateSegment = 'date segment';
    const timeSegment = 'time segment';

    let reportNameGeneratorBuilderMock: IMock<ReportNameGeneratorBuilder>;
    let testObject: ReportNameGenerator;

    beforeEach(() => {
        reportNameGeneratorBuilderMock = Mock.ofType(ReportNameGeneratorBuilder);
        testObject = new ReportNameGenerator(reportNameGeneratorBuilderMock.object);

        reportNameGeneratorBuilderMock
            .setup((rngbm) => rngbm.getDateSegment(theDate))
            .returns(() => dateSegment)
            .verifiable(Times.once());
        reportNameGeneratorBuilderMock
            .setup((rngbm) => rngbm.getTimeSegment(theDate))
            .returns(() => timeSegment)
            .verifiable(Times.once());
    });

    it('generateName', () => {
        const actual = testObject.generateName(theBase, theDate);

        const expected = `${theBase}-${dateSegment}-${timeSegment}`;
        expect(actual).toEqual(expected);

        reportNameGeneratorBuilderMock.verifyAll();
    });
});
