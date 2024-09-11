sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'yourname3a01/productsfaqapp/test/integration/FirstJourney',
		'yourname3a01/productsfaqapp/test/integration/pages/ProductFAQList',
		'yourname3a01/productsfaqapp/test/integration/pages/ProductFAQObjectPage'
    ],
    function(JourneyRunner, opaJourney, ProductFAQList, ProductFAQObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('yourname3a01/productsfaqapp') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheProductFAQList: ProductFAQList,
					onTheProductFAQObjectPage: ProductFAQObjectPage
                }
            },
            opaJourney.run
        );
    }
);