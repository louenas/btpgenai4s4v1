sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'yourname3a01/mymessages/test/integration/FirstJourney',
		'yourname3a01/mymessages/test/integration/pages/CustomerMessageList',
		'yourname3a01/mymessages/test/integration/pages/CustomerMessageObjectPage'
    ],
    function(JourneyRunner, opaJourney, CustomerMessageList, CustomerMessageObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('yourname3a01/mymessages') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheCustomerMessageList: CustomerMessageList,
					onTheCustomerMessageObjectPage: CustomerMessageObjectPage
                }
            },
            opaJourney.run
        );
    }
);