sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'yourname3a01/customerapp/test/integration/FirstJourney',
		'yourname3a01/customerapp/test/integration/pages/Main'
    ],
    function(JourneyRunner, opaJourney, Main) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('yourname3a01/customerapp') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheMain: Main
                }
            },
            opaJourney.run
        );
    }
);