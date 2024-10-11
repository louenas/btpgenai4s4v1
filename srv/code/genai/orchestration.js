const llmConfig = {
  model_name: 'gpt-4o-mini',
  model_params: {
    max_tokens: 2048,
    temperature: 0.1,
    response_format: {
      type: 'json_object',
    },
  }
};
// orchestration.js
/**
 * Create different types of orchestration requests.
 * @param {string} text - Name of the sample case to orchestrate.
 * @returns {Promise<string|undefined>} The message content from the orchestration service in the generative AI hub.
 */
async function orchestrationCompletion(mode, prompt) {
  switch (mode) {
    case 'simple':
      return orchestrationCompletionSimple(prompt);
    case 'template':
      return orchestrationCompletionTemplate(prompt);
    case 'filtering':
      return orchestrationCompletionFiltering(prompt);
    default:
      return undefined;
  }
}

async function orchestrationCompletionSimple(prompt) {
  const { OrchestrationClient } = await import('@sap-ai-sdk/orchestration');
  try {
    const orchestrationClient = new OrchestrationClient({
      llm: llmConfig,
      templating: {
        template: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }
    });

    const response = await orchestrationClient.chatCompletion();

    return JSON.parse(response.getContent());
  } catch (error) {
    return `Error: ${JSON.stringify(error)}`;
  }
}

async function orchestrationCompletionTemplate(prompt) {
  const { OrchestrationClient } = await import('@sap-ai-sdk/orchestration');
  try {
    const orchestrationClient = new OrchestrationClient({
      llm: llmConfig,
      templating: {
        template: [
          { role: 'system', content: 'Please generate contents with HTML tags.' },
          {
            role: 'user',
            content: 'create a message based on {{?issue}} for a {{?position}}'
          }
        ]
      }
    });

    const response = await orchestrationClient.chatCompletion({
      inputParams: { position: 'refregiration technician', issue: prompt }
    });
    return JSON.parse(response.getContent());
  } catch (error) {
    return `Error: ${JSON.stringify(error)}`;
  }
}

async function orchestrationCompletionFiltering(prompt) {
  const { OrchestrationClient, buildAzureContentFilter } = await import('@sap-ai-sdk/orchestration');
  try {
    const orchestrationClient = new OrchestrationClient({
      llm: llmConfig,
      templating: {
        template: [
          { role: 'user', content: prompt }
        ]
      },
      filtering: {
        input: buildAzureContentFilter({ SelfHarm: 0 })
      }
    });

    const response = await orchestrationClient.chatCompletion();
    return JSON.parse(response.getContent());
  } catch (error) {
    return `Error: ${JSON.stringify(error)}`;
  }
}

module.exports = {
  orchestrationCompletion
};