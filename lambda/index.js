const lib = require('./lib');

const SSM = require('aws-sdk/clients/ssm');
const ssm = new SSM({
    region: process.env.AWS_REGION,
    apiVersions: '2014-11-06'
});

let coldStart = true;
let auth0TokenIssuer, auth0Audience, data;

const getValueFromParameterStore = async (name, decrypt = false) => {
    const params = {
        Name: name,
        WithDecryption: decrypt
    };

    const p = await ssm.getParameter(params).promise();
    return p.Parameter.Value;
}

const initialiseContainer = async () => {
    console.log('Cold start. Initialising container...');

    // Fetch Auth0 details from Parameter Store
    [auth0TokenIssuer, auth0Audience] = await Promise.all([
        getValueFromParameterStore('/Guardian/Auth0/TokenIssuer'),
        getValueFromParameterStore('/Guardian/Auth0/Audience')
    ]);
    
    // flag coldStart to false
    coldStart = false;
    console.log('DONE - Initialising container.');

    return;
}

// Lambda function index.handler - thin wrapper around lib.authenticate
module.exports.handler = async (event) => {
  try {
    if (coldStart || auth0TokenIssuer === null || auth0Audience === null)
      await initialiseContainer();

    data = await lib.authenticate(event, {
      audience: auth0Audience,
      issuer: auth0TokenIssuer
    });
  }
  catch (err) {
      console.log(err);
      throw new Error('Unauthorized'); //: ${err.message}`;
  }
  return data;
};
