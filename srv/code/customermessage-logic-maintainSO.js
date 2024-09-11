const lLMProxy = require('./utils/genAIHubProxyDirect');
const LOG = cds.log('GenAI');

/**
 * 
 * @On(event = { "Action2" }, entity = "yourname_3_a01Srv.CustomerMessage")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(request) {
	try {
		// Extract the customer message ID from the request parameters
		const { ID } = request.params[0];
	
		// Fetch the customer message from the database using the ID
		const customerMessage = await SELECT.one.from('yourname_3_a01.CustomerMessage').where({ ID });
		if (!customerMessage) throw new Error(`CustomerMessage with ID ${ID} not found`);
	
		// Extract necessary information from the customer message
		const {
			titleEnglish,
			fullMessageEnglish,
			suggestedResponseEnglish,
			S4HC_ServiceOrder_ServiceOrder: attachedSOId
		} = customerMessage;
	
		// Connect to the S4HCP Service Order OData service
		const s4HcpServiceOrderOdata = await cds.connect.to('S4HCP_ServiceOrder_Odata');
		const { A_ServiceOrder, A_ServiceOrderText } = s4HcpServiceOrderOdata.entities;
	
		if (attachedSOId) {
			// Add suggested response to the existing Service Order
			const finalNote = await s4HcpServiceOrderOdata.run(
				INSERT.into(A_ServiceOrderText, {
					ServiceOrder: attachedSOId,
					Language: 'EN',
					LongTextID: 'S003',
					LongText: suggestedResponseEnglish
				})
			);
			LOG.info(`Created Service Order Note: ${JSON.stringify(finalNote)}`);
	
		} else {
			// Build the Service Order request body
			const itemDur = {
				ServiceOrderItemDescription: 'Service Order duration',
				Product: 'SRV_01',
				ServiceDuration: 1,
				ServiceDurationUnit: 'HR'
			};
			const itemQty = {
				ServiceOrderItemDescription: 'Service Order quantity',
				Product: 'SRV_02',
				Quantity: 1,
				QuantityUnit: 'EA'
			};
			const persResp = { PersonResponsible: '9980003640' };
			const initNote = {
				Language: 'EN',
				LongTextID: 'S001',
				LongText: fullMessageEnglish
			};
			const servOrder = {
				ServiceOrderType: 'SVO1',
				ServiceOrderDescription: titleEnglish,
				Language: 'EN',
				ServiceDocumentPriority: '5',
				SalesOrganization: '1710',
				DistributionChannel: '10',
				Division: '00',
				SoldToParty: '17100002',
				to_PersonResponsible: [persResp],
				to_Item: [itemDur, itemQty],
				to_Text: [initNote]
			};
	
			// Create the Service Order
			const serviceOrder = await s4HcpServiceOrderOdata.run(INSERT.into(A_ServiceOrder, servOrder));
			const soId = serviceOrder.ServiceOrder;
	
			LOG.info(`Created Service Order: ${JSON.stringify(serviceOrder)}`);
	
			// Update the customer message with the new service order ID
			await UPDATE('yourname_3_a01.CustomerMessage')
				.set({ S4HC_ServiceOrder_ServiceOrder: soId })
				.where({ ID });
	
			LOG.info(`Updated customer message with Service Order Id: ${soId}`);
		}
	
	} catch (err) {
		LOG.error(JSON.stringify(err));
	
		const message = err.rootCause?.message || 'An error occurred';
		request.reject({
			code: '',
			message,
			target: '',
			status: 500,
		});
	}	
}