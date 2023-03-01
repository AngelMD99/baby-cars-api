const base = require("../controllers/base.controller.js");

const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}

const getMainOpts = {
    schema: {
        description:'The root URL of the API, will retrieve the basic information',
        tags:['General'],
        response: {
            201: {
                type: 'string'
            },
            400: errResponse
        }
    },
    handler: base.main
}

function baseRoutes(fastify,options,done){
    fastify.get('/',getMainOpts);
    //fastify.get('/globalusd',getUSDOpts);
    //fastify.put('/globalusd',updateUSDOpts);
    //fastify.put('/globalusd',base.updateUSDMarket);
    
    done()
}

module.exports = baseRoutes