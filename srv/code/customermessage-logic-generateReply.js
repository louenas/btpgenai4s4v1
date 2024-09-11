const lLMProxy = require('./utils/genAIHubProxyDirect');
const LOG = cds.log('GenAI');

/**
 * 
 * @On(event = { "Action1" }, entity = "yourname_3_a01Srv.CustomerMessage")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function (request) {
	try {
		// Extract the customer message ID from the request parameters
		const { ID } = request.params[0];
	
		// Fetch the customer message from the database using the ID
		const customerMessage = await SELECT.one.from('yourname_3_a01.CustomerMessage').where({ ID });
	
		const {
			fullMessageCustomerLanguage,
			messageCategory,
			messageSentiment,
			S4HC_ServiceOrder_ServiceOrder: attachedSOId
		} = customerMessage;
	
		let soContext = '';
		if (attachedSOId) {
			// Fetch service order details if there's an attached service order
			const s4HcpServiceOrderOdata = await cds.connect.to('S4HCP_ServiceOrder_Odata');
			const { A_ServiceOrder } = s4HcpServiceOrderOdata.entities;
			const s4hcSO = await s4HcpServiceOrderOdata.run(
				SELECT.from(A_ServiceOrder, so => {
					so('ServiceOrder'),
						so.to_Text(note => {
							note('*')
						})
				})
					.where({ ServiceOrder: attachedSOId })
			);
	
			// Concatenate long texts from the service order into a single string
			soContext = s4hcSO[0].to_Text.map(note => note.LongText).join(' ');
		}
	
		let replyPrompt = '';
		if (messageCategory === 'Technical') {
			// Embed the customer message to find relevant FAQs
			const fullMessageEmbedding = await lLMProxy.embed(request, fullMessageCustomerLanguage, process.env.embeddingEndpoint);
			const fullMessageEmbeddingStr = JSON.stringify(fullMessageEmbedding);
	
			// Select the closest FAQ Item
			const relevantFAQs = await SELECT`id, issue, question, answer`
				.from('yourname_3_a01.ProductFAQ')
				.where`cosine_similarity(embedding, to_real_vector(${fullMessageEmbeddingStr})) > 0.7`;
	
			// Construct part of the prompt for a Technical issue
			const faqItem = relevantFAQs[0] || { question: '', answer: '' };
			replyPrompt = `
					Generate a helpful reply message including the troubleshooting procedure to the newCustomerMessage based on previousCustomerMessages and relevantFAQItem:
					relevantFAQItem: ${faqItem.question} ${faqItem.answer}`;
		} else {
			// Generate a different prompt type based on the sentiment
			const messageType = messageSentiment === 'Negative' ? 'a "we are sorry" note' : 'a gratitude note';
			replyPrompt = `
					Generate ${messageType} to the newCustomerMessage based on previousCustomerMessages:`;
		}
	
		// Complete the prompt - common to both cases
		replyPrompt += `
				newCustomerMessage: ${fullMessageCustomerLanguage}
				${soContext ? `previousCustomerMessages: ${soContext}` : ''}
				Produce the reply in two languages: in the original language of newCustomerMessage and in English. Return the result in the following JSON template:
				JSON template: {
					suggestedResponseEnglish: Text,
					suggestedResponseCustomerLanguage: Text
				}`;
	
		// Generate the reply body using the constructed prompt
		const resultRaw = await lLMProxy.completion(request, replyPrompt, process.env.completionEndpoint);
		const resultJSON = JSON.parse(resultRaw);
		const {
			suggestedResponseCustomerLanguage,
			suggestedResponseEnglish
		} = resultJSON;
	
		// Update the customer message in the database with the generated reply
		await UPDATE('yourname_3_a01.CustomerMessage').set({
			suggestedResponseCustomerLanguage,
			suggestedResponseEnglish,
		}).where({ ID });
	
		LOG.info(`CustomerMessage with ID ${ID} updated with a reply to the customer.`);
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