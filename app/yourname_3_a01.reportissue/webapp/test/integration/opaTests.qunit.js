sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'yourname3a01/reportissue/test/integration/FirstJourney',
		'yourname3a01/reportissue/test/integration/pages/ReportMessageObjectPage'
    ],
    function(JourneyRunner, opaJourney, ReportMessageObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('yourname3a01/reportissue') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheReportMessageObjectPage: ReportMessageObjectPage
                }
            },
            opaJourney.run
        );
    }
);