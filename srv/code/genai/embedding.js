async function getEmbedding(request, content) {
    try {
        const { AzureOpenAiEmbeddingClient } = await import('@sap-ai-sdk/foundation-models');
            const response = await new AzureOpenAiEmbeddingClient(
                'text-embedding-3-small'
              ).run({
                input: content
              });
            const embedding =  response.getEmbedding();
                          // Ensure embedding is valid before updating
            if (!embedding || !Array.isArray(embedding)) {
                return request.reject(500, 'Invalid embedding received from the service.');
            }
              // Use getEmbedding to access the embedding vector
              return embedding;
    } catch (error) {
        LOG.error('Embedding service failed:', error.message);
        return request.reject(503, 'Embedding service is unavailable.');
    }
}

module.exports = {getEmbedding};