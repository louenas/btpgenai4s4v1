namespace yourname_3_a01;

using { S4HCP_ServiceOrder_Odata } from '../srv/external/S4HCP_ServiceOrder_Odata.cds';

using { cuid } from '@sap/cds/common';

entity CustomerMessage : cuid
{
    customerMessageID : Integer @mandatory;
    titleEnglish : String(100);
    customerName : String(100);
    productName : String(100);
    summaryEnglish : String(1000);
    messageCategory : String(100);
    messageUrgency : String(100);
    messageSentiment : String(100);
    titleCustomerLanguage : String(100);
    customerId : String(100);
    productId : String(100);
    summaryCustomerLanguage : String(1000);
    originatingCountry : String(100);
    sourceLanguage : String(100);
    fullMessageCustomerLanguage : String(5000);
    fullMessageEnglish : String(5000);
    suggestedResponseEnglish : String(5000);
    suggestedResponseCustomerLanguage : String(5000);
    S4HC_ServiceOrder : Association to one S4HCP_ServiceOrder_Odata.A_ServiceOrder;
}
entity ProductFAQ
{
    key ID : Integer;
    issue : LargeString;
    question : LargeString;
    answer : LargeString;
    embedding : Vector(1536);
}

