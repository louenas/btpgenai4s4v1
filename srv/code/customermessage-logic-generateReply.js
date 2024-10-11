const cds = require('@sap/cds');
const LOG = cds.log('GenAI');
const { orchestrationCompletion } = require('./genai/orchestration');
const { getEmbedding } = require('./genai/embedding');

const SIMILARITY_THRESHOLD = 0.3;

/**
 * 
 * @On(event = { "Action1" }, entity = "yourname_3_a01Srv.CustomerMessage")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
 */
module.exports = async function (request) {
    try {
        const { ID } = request.params[0] || {};
        if (!ID) {
            return request.reject(400, 'ID parameter is missing.');
        }
    
        const customerMessage = await SELECT.one.from('yourname_3_a01.CustomerMessage').where({ ID });
        if (!customerMessage) {
            return request.reject(404, `CustomerMessage with ID ${ID} not found.`);
        }
    
        const { fullMessageCustomerLanguage, messageCategory, messageSentiment, S4HC_ServiceOrder_ServiceOrder: attachedSOId } = customerMessage;
    
        let soContext = '';
    
        if (attachedSOId) {
            try {
                const s4HcpServiceOrderOdata = await cds.connect.to('S4HCP_ServiceOrder_Odata');
                const { A_ServiceOrder } = s4HcpServiceOrderOdata.entities;
    
                const s4hcSO = await s4HcpServiceOrderOdata.run(
                    SELECT.from(A_ServiceOrder, so => {
                        so('ServiceOrder');
                        so.to_Text(note => {
                            note('LongText');
                        });
                    }).where({ ServiceOrder: attachedSOId })
                );
    
                if (s4hcSO && s4hcSO.length > 0) {
                    const serviceOrder = s4hcSO[0];
                    const notes = serviceOrder.to_Text || [];
                    soContext = notes.map(note => note.LongText || '').join(' ');
                } else {
                    LOG.warn(`No service order found for ID: ${attachedSOId}`);
                    soContext = '';
                }
            } catch (error) {
                LOG.error('Error fetching service order details:', error.message);
                soContext = '';
            }
        } else {
            LOG.warn('No or Invalid attachedSOId provided.');
        }
    
        let replyPrompt = '';
    
        if (messageCategory === 'Technical') {
            let fullMessageEmbedding;
            try {
                fullMessageEmbedding = await getEmbedding(request, fullMessageCustomerLanguage)
            } catch (err) {
                LOG.error('Embedding service failed:', err);
                return request.reject(503, 'Embedding service is unavailable.');
            }
    
            const relevantFAQs = await SELECT.from('yourname_3_a01.ProductFAQ')
                .columns('ID', 'issue', 'question', 'answer')
                .where`cosine_similarity(embedding, to_real_vector(${fullMessageEmbedding})) > ${SIMILARITY_THRESHOLD}`;
    
            const faqItem = (relevantFAQs && relevantFAQs.length > 0) ? relevantFAQs[0] : { issue: '', question: '', answer: '' };
            replyPrompt = `
                Generate a helpful reply message including the troubleshooting procedure to the newCustomerMessage based on previousCustomerMessages and relevantFAQItem:
                relevantFAQItem: issue - ${faqItem.issue}. Question - ${faqItem.question} and Answer - ${faqItem.answer}`;
        } else {
            const messageType = messageSentiment === 'Negative' ? 'a "we are sorry" note' : 'a gratitude note';
            replyPrompt = `
                Generate ${messageType} to the newCustomerMessage:`;
        }
    
        replyPrompt += `
            newCustomerMessage: ${fullMessageCustomerLanguage}
            ${soContext ? `previousCustomerMessages: ${soContext}` : ''}
            Produce the reply in two languages: in the original language of newCustomerMessage and in English. Return the result in the following JSON template:
            JSON template: {
                suggestedResponseEnglish: Text,
                suggestedResponseCustomerLanguage: Text
            }`;

        let resultJSON;
        try {
            resultJSON = await orchestrationCompletion("filtering", replyPrompt);
        } catch (err) {
            LOG.error('Completion service failed or JSON parsing error:', err);
            return request.reject(503, 'Completion service is unavailable or response is invalid.');
        }
    
        const { suggestedResponseCustomerLanguage, suggestedResponseEnglish } = resultJSON;
    
        if (!suggestedResponseCustomerLanguage || !suggestedResponseEnglish) {
            return request.reject(500, 'Generated responses are invalid.');
        }
    
        await UPDATE('yourname_3_a01.CustomerMessage').set({
            suggestedResponseCustomerLanguage,
            suggestedResponseEnglish,
        }).where({ ID });
    
        LOG.info(`CustomerMessage with ID ${ID} updated with a reply to the customer.`);
    } catch (err) {
        LOG.error('An error occurred:', err.message);
        request.reject({
            code: 'INTERNAL_SERVER_ERROR',
            message: err.message || 'An error occurred',
            target: 'GenerateReply',
            status: err.code || 500,
        });
    }
}