const axios = require('axios');
const qs = require('qs');

class GenAIHubClient {
  constructor() {
    this.accessToken = null;
    this.accessTokenExpiry = null;

    // Validate environment variables
    const requiredEnvVars = [
      'genAITokenURL',
      'genAIClientID',
      'genAIClientSecret',
      'genAIModelDeploymentRootURL',
    ];

    requiredEnvVars.forEach((envVar) => {
      if (!process.env[envVar]) {
        console.error(`Environment variable ${envVar} is not set.`);
        process.exit(1); // Exit the application
      }
    });

    // Create Axios instance
    this.axiosInstance = axios.create({
      baseURL: process.env.genAIModelDeploymentRootURL,
      headers: {
        'AI-Resource-Group': 'default',
      },
      timeout: 10000, // 10 seconds
    });

    // Add interceptor to inject access token
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.ensureAccessToken();
      config.headers['Authorization'] = `Bearer ${this.accessToken}`;
      return config;
    });
  }

  async getAccessToken() {
    try {
      const tokenConfig = {
        method: 'post',
        url: process.env.genAITokenURL,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify({
          grant_type: 'client_credentials',
          client_id: process.env.genAIClientID,
          client_secret: process.env.genAIClientSecret,
        }),
      };

      const response = await axios(tokenConfig);
      const { access_token, expires_in } = response.data;
      this.accessToken = access_token;
      this.accessTokenExpiry = Date.now() + expires_in * 1000; // expires_in is in seconds
    } catch (err) {
      console.error('Error obtaining access token:', err.message);
      throw new Error(`Error obtaining access token: ${err.message}`);
    }
  }

  isTokenValid() {
    return this.accessToken && this.accessTokenExpiry && Date.now() < this.accessTokenExpiry;
  }

  async ensureAccessToken() {
    if (!this.isTokenValid()) {
      await this.getAccessToken();
    }
  }

  async makeRequestWithRetry(config, retries = 3, delay = 1000) {
    try {
      return await this.axiosInstance(config);
    } catch (err) {
      if (retries > 0) {
        // Retry on specific error codes
        if (err.response && err.response.status === 500) {
          console.warn(`Retrying request due to server error (attempts left: ${retries - 1})`);
          await this.delay(delay);
          return this.makeRequestWithRetry(config, retries - 1, delay * 2); // Exponential backoff
        }
        // Handle token expiration or other retry scenarios
        if (err.response && err.response.status === 401) {
          await this.getAccessToken();
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;
          return this.makeRequestWithRetry(config, retries, delay);
        }
      }
      this.handleAxiosError(err);
    }
  }

  handleAxiosError(err) {
    if (err.response) {
      console.error('Response error:', err.response.status, err.response.data);
      throw new Error(`Server responded with status ${err.response.status}: ${JSON.stringify(err.response.data)}`);
    } else if (err.request) {
      console.error('No response received:', err.request);
      throw new Error('No response received from server.');
    } else {
      console.error('Error setting up request:', err.message);
      throw err;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async completion(req, prompt, llmEndpoint) {
    try {
      const postData = {
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2048,
        temperature: 0.1,
        response_format: {
          type: 'json_object',
        },
      };

      const config = {
        method: 'post',
        url: llmEndpoint,
        data: postData,
      };

      const results = await this.makeRequestWithRetry(config);
      const res = results.data?.choices[0]?.message?.content;
      if (!res) {
        throw new Error('Invalid response structure from completion endpoint.');
      }
      return res;
    } catch (err) {
      console.error('Error in completion:', err.message);
      throw err;
    }
  }

  async embed(req, text, llmEndpoint) {
    try {
      const postData = {
        input: text,
      };

      const config = {
        method: 'post',
        url: llmEndpoint,
        data: postData,
      };

      const results = await this.makeRequestWithRetry(config);
      if (!results.data || !Array.isArray(results.data.data) || !results.data.data[0].embedding) {
        throw new Error('Invalid response structure from embedding endpoint.');
      }
      const res = results.data.data[0].embedding;
      return res;
    } catch (err) {
      console.error('Error in embed:', err.message);
      throw err;
    }
  }
}

module.exports = new GenAIHubClient();