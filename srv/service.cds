using { S4HCP_ServiceOrder_Odata } from './external/S4HCP_ServiceOrder_Odata.cds';

using { yourname_3_a01 as my } from '../db/schema.cds';

@path : '/service/yourname_3_a01'
service yourname_3_a01Srv
{
    @odata.draft.enabled
    entity CustomerMessage as
        projection on my.CustomerMessage
        actions
        {
            @cds.odata.bindingparameter.name : '_it'
            @Common.SideEffects : 
            {
                TargetProperties :
                [
                    '_it/suggestedResponseEnglish',
                    '_it/suggestedResponseCustomerLanguage'
                ]
            }
            action Action1
            (
            );

            @cds.odata.bindingparameter.name : '_it'
            @Common.SideEffects : 
            {
                TargetProperties :
                [
                    '_it/S4HC_ServiceOrder_ServiceOrder'
                ]
            }
            action Action2
            (
            );
        };

    entity A_ServiceOrder as
        projection on S4HCP_ServiceOrder_Odata.A_ServiceOrder
        {
            ServiceOrder,
            ServiceOrderDescription
        };

    @odata.draft.enabled
    entity ProductFAQ as
        projection on my.ProductFAQ
        {
            ID,
            issue,
            question,
            answer
        };

    @odata.draft.enabled
    entity ReportMessage as
        projection on my.CustomerMessage
        {
            ID,
            customerMessageID,
            customerName,
            productName,
            titleCustomerLanguage,
            customerId,
            productId,
            originatingCountry,
            sourceLanguage,
            fullMessageCustomerLanguage,
        };
}

annotate yourname_3_a01Srv with @requires :
[
    'authenticated-user'
];
