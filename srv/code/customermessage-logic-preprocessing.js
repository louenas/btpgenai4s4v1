const lLMProxy = require('./utils/genAIHubProxyDirect');
const utils = require('./utils/utils');
const LOG = cds.log('GenAI');

/**
 * message categorization, urgency classification, service categorization and summarization and translation
 * @Before(event = { "READ" }, entity = "yourname_3_a01Srv.CustomerMessage")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function (request) {
	try {
		// Select all customer messages from the database for update
		const customerMessages = await SELECT.from('yourname_3_a01.CustomerMessage').forUpdate();

		// Process customer message in the results in parallel for better perf
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

			// Check if the message needs processing
			if (!titleEnglish || !messageCategory || !messageUrgency || !messageSentiment || !summaryCustomerLanguage || !summaryEnglish || !fullMessageEnglish) {
				const prompt = `
                    Categorize the fullMessageTextCustomerLanguage into one of (Technical, Delivery, Service). 
                    Classify urgency of the fullMessageTextCustomerLanguage into one of (High, Medium, Low). 
                    Classify sentiment of the fullMessageTextCustomerLanguage into one of (Negative, Positive, Neutral). 
                    Translate fullMessageTextCustomerLanguage to English and put it in fullMessageEnglish.
                    Summarize fullMessageTextCustomerLanguage into 20 words max and keep the original language and put it in summaryCustomerLanguage. 
                    Translate the summaryCustomerLanguage to English and put it in summaryEnglish.
                    Translate the titleCustomerLanguage to English and put it in titleEnglish.
                    Return the result in the provided JSON template below:
                    titleCustomerLanguage: ${titleCustomerLanguage}
                    fullMessageTextCustomerLanguage: ${fullMessageCustomerLanguage}
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

				// Complete the message with the generated data by GenAI Hub
				const resultRaw = await lLMProxy.completion(request, prompt, process.env.completionEndpoint);
				const resultJSON = JSON.parse(resultRaw);
				const {
					fullMessageEnglish,
					titleEnglish,
					summaryCustomerLanguage,
					summaryEnglish,
					messageCategory,
					messageUrgency,
					messageSentiment
				} = resultJSON;

				// Update the customer message in the database with the processed results
				await UPDATE('yourname_3_a01.CustomerMessage')
					.set({ fullMessageEnglish, titleEnglish, summaryCustomerLanguage, summaryEnglish, messageCategory, messageUrgency, messageSentiment })
					.where({ ID });

				LOG.info(`CustomerMessage with ID ${ID} updated`);
			} else {
				LOG.info(`CustomerMessage ${ID} already processed`);
			}
		}));
	} catch (err) {
		LOG.error(JSON.stringify(err));

		const message = err.rootCause?.message || 'An error occurred';
		request.reject({
			code: '',
			message: message,
			target: '',
			status: 500,
		});
	}
}