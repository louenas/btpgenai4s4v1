const lLMProxy = require('./utils/genAIHubProxyDirect');
const utils = require('./utils/utils');
const LOG = cds.log('GenAI');

/**
 * 
 * @After(event = { "CREATE","UPDATE" }, entity = "yourname_3_a01Srv.ProductFAQ")
 * @param {(Object|Object[])} results - For the After phase only: the results of the event processing
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(results, request) {
	try {
		// Extract the customer message ID from the request parameters
		const productFAQID = request.data.ID;
	
		// Fetch the specific ProductFAQ entry for update
		let productFAQ = await SELECT.one('yourname_3_a01.ProductFAQ').where({ ID: productFAQID }).forUpdate();
	
		const {
			ID,
			issue,
			question,
			answer
		} = productFAQ;
	
		// Embed the concatenated issue, question, and answer text
		let embedding = await lLMProxy.embed(request, issue + " " + question + " " + answer, process.env.embeddingEndpoint);
	
		// Update the ProductFAQ entry with the new embedding
		await UPDATE("yourname_3_a01.ProductFAQ", ID).with({ embedding: utils.array2VectorBuffer(embedding) });
	
	} catch (err) {
		// Log the error and send a response
		LOG.error(JSON.stringify(err));
	
		// Extract the root cause message if available
		const message = err.rootCause?.message || err.message || 'An unexpected error occurred';
		request.reject({
			code: "",
			message: message,
			target: "",
			status: 500,
		});
	}
}