require('dotenv').config({ silent: true });

const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const util = require('util');

const getPolicyDocument = (effect, resource) => {
    const api_arn = resource.split('/')[0];
    const stage = resource.split('/')[1];

    const policyDocument = {
        Version: '2012-10-17', // default version
        Statement: [{
            Action: 'execute-api:Invoke', // default action
            Effect: effect,
            Resource: `${api_arn}/${stage}/*`, // granting access to all methods in the specified stage
            /* authoriser caching issue
            https://forums.aws.amazon.com/thread.jspa?threadID=225934&tstart=0
            This error happens if you specify event.methodArn as resource in the generated policy,
            but want to use the same Lambda function for multiple methods in the API. The first valid
            call to method 'A' returns a policy that is cached. The same policy is returned even when
            the call is for method 'B' because the same token is used. But since the event.methodArn is
            wrong in the policy, a 403 is returned. 

            The solution is to then to not reference the event.methodArn in the policy. Instead, use a 
            wildcard to cover all the methods that the token will be used for like below:
            arn:aws:execute-api:eu-west-1:1234567890:abcdefghi/prod/*

            Don't disable cacheing. Unless you have money to waste.
            */
        }]
    };
    
    return policyDocument;
}


// extract and return the Bearer Token from the Lambda event parameters
const getToken = (params) => {
    if (!params.type || params.type !== 'TOKEN') {
        throw new Error('Expected "event.type" parameter to have value "TOKEN"');
    }

    const tokenString = params.authorizationToken;
    if (!tokenString) {
        throw new Error('Expected "event.authorizationToken" parameter to be set');
    }

    const match = tokenString.match(/^Bearer (.*)$/);
    if (!match || match.length < 2) {
        throw new Error(`Invalid Authorization token - ${tokenString} does not match "Bearer .*"`);
    }
    return match[1];
}

module.exports.authenticate = (params, jwtOptions) => {
    const token = getToken(params);

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('invalid token');
    }

    const client = jwksClient({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10, // Default value
        jwksUri: `${jwtOptions.issuer}.well-known/jwks.json`
    });

    const getSigningKey = util.promisify(client.getSigningKey);

    return getSigningKey(decoded.header.kid)
        .then((key) => {
            const signingKey = key.publicKey || key.rsaPublicKey;
            return jwt.verify(token, signingKey, jwtOptions);
        })
        .then((decoded)=> Object.assign({}, {
            'principalId': decoded.sub,
            'policyDocument': getPolicyDocument('Allow', params.methodArn),
            'context': { 'scope': decoded.scope }
        }));
}
