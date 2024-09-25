sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'yourname3a01.reportissue',
            componentId: 'ReportMessageObjectPage',
            contextPath: '/ReportMessage'
        },
        CustomPageDefinitions
    );
});