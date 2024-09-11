const axios = require('axios');
const qs = require('qs');

let genAIHubAccessToken;

async function getAccessToken() {
  try {
    const tokenConfig = {
      method: 'post',
      url: process.env.genAITokenURL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: qs.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.genAIClientID,
        client_secret: process.env.genAIClientSecret
      })
    };

    const response = await axios(tokenConfig);
    return response.data.access_token;
  } catch (err) {
    console.error('Error obtaining access token:', err);
    throw err; // Propagate the error
  }
}

const completion = async function (req, prompt, llmEndpoint) {
  try {
    genAIHubAccessToken = genAIHubAccessToken || await getAccessToken();
    if (!genAIHubAccessToken) 
      throw new Error('Error obtaining GenAIHub access token');

    const postData = {
      "messages": [
        {
          "role": "user",
          "content": prompt
        }
      ],
      "max_tokens": 5000,
      "temperature": 0.1,
      "response_format": 
      { 
        "type": "json_object" 
      }
    };

    const config = {
      method: 'post',
      url: process.env.genAIModelDeploymentRootURL + llmEndpoint,
      headers: {
        'Authorization': `Bearer ${genAIHubAccessToken}`,
        'AI-Resource-Group': 'default'
      },
      data: postData
    };

    const results = await axios(config);
    console.log('Response: ', results);
    //.content should be a string form of a Json object
    var res = results.data?.choices[0]?.message?.content;
    return res;
  } catch (err) {
    console.error('Error: ', JSON.stringify(err));
    throw err;
  }
}

const embed = async function (req, text, llmEndpoint) {
  genAIHubAccessToken = genAIHubAccessToken || await getAccessToken();
  if (!genAIHubAccessToken) return;

  const postData = {
    "input": text
  };
  const config = {
    method: 'post',
    url: process.env.genAIModelDeploymentRootURL + llmEndpoint,
    headers: {
      'Authorization': `Bearer ${genAIHubAccessToken}`,
      'AI-Resource-Group': 'default'
    },
    data: postData
  };

  try {
    const results = await axios(config);
    console.log('Response: ', results);
    //.embedding is already a Json object
    
    var res = results.data.data[0].embedding;
    return res;
  } catch (err) {
    console.error('Error: ', JSON.stringify(err));
    throw err;
  }
}

module.exports = {
  completion,
  embed
}