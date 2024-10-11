const LOG = cds.log('GenAI');
const { orchestrationCompletion } = require('./genai/orchestration');

/**
 * message categorization, urgency classification, service categorization and summarization and translation
 * @Before(event = { "READ" }, entity = "yourname_3_a01Srv.CustomerMessage")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function (request) {
	try {
		const customerMessages = await SELECT.from('yourname_3_a01.CustomerMessage').forUpdate();
	
		await Promise.all(customerMessages.map(async customerMessage => {
			const {
				ID,
				titleEnglish,
				summaryEnglish,
				messageCategory,
				messageUrgency,
				messageSentiment,
				titleCustomerLanguage,
				summaryCustomerLanguage,
				fullMessageCustomerLanguage,
				fullMessageEnglish
			} = customerMessage;
	
			if (!titleEnglish || !messageCategory || !messageUrgency || !messageSentiment || !summaryCustomerLanguage || !summaryEnglish || !fullMessageEnglish) {
				const prompt = `
					Categorize the fullMessageCustomerLanguage into one of (Technical, Delivery, Service). 
					Classify urgency of the fullMessageCustomerLanguage into one of (High, Medium, Low). 
					Classify sentiment of the fullMessageCustomerLanguage into one of (Negative, Positive, Neutral). 
					Translate fullMessageCustomerLanguage to English and put it in fullMessageEnglish.
					Summarize fullMessageCustomerLanguage into 20 words max and keep the original language and put it in summaryCustomerLanguage. 
					Translate the summaryCustomerLanguage to English and put it in summaryEnglish.
					Translate the titleCustomerLanguage to English and put it in titleEnglish.
					Return the result in the following JSON template:
					titleCustomerLanguage: ${titleCustomerLanguage}
					fullMessageCustomerLanguage: ${fullMessageCustomerLanguage}
					JSON template: {
						fullMessageEnglish: Text,
						titleEnglish: Text, 
						summaryCustomerLanguage: Text, 
						summaryEnglish: Text, 
						messageCategory: Text, 
						messageUrgency: Text, 
						messageSentiment: Text
					}
				`;
	
				let resultJSON;
				try {
					resultJSON = await orchestrationCompletion("filtering", prompt);
				} catch (error) {
					LOG.error(`Error from completion service for CustomerMessage ID ${ID}: ${error.message}`);
					return;  // Skip this message and proceed to the next
				}
	
				const {
					fullMessageEnglish,
					titleEnglish,
					summaryCustomerLanguage,
					summaryEnglish,
					messageCategory,
					messageUrgency,
					messageSentiment
				} = resultJSON;
	
				if (!fullMessageEnglish || !titleEnglish || !summaryCustomerLanguage || !summaryEnglish || !messageCategory || !messageUrgency || !messageSentiment) {
					LOG.error(`Incomplete response from completion service for CustomerMessage ID ${ID}`);
					return;  // Skip this message and proceed to the next
				}
	
				try {
					await UPDATE('yourname_3_a01.CustomerMessage')
						.set({ fullMessageEnglish, titleEnglish, summaryCustomerLanguage, summaryEnglish, messageCategory, messageUrgency, messageSentiment })
						.where({ ID });
					LOG.info(`CustomerMessage with ID ${ID} updated`);
				} catch (updateError) {
					LOG.error(`Error updating CustomerMessage ID ${ID}: ${updateError.message}`);
				}
			} else {
				LOG.info(`CustomerMessage ID ${ID} already processed`);
			}
		}));
	} catch (err) {
		LOG.error('An unexpected error occurred:', err.message || JSON.stringify(err));
		request.reject({
			code: 'INTERNAL_SERVER_ERROR',
			message: err.message || 'An error occurred',
			target: 'ProcessCustomerMessages',
			status: err.code || 500,
		});
	}
}