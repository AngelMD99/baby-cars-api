const { branchLogin } = require('../controllers/branch.controller');
const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}

const branchDef = { 
    type: 'object', 
    properties: {
        _id: { type: 'string' },                
        code :{type:'string'},
        name: { type: 'string' },        
        location: { type: 'string'},
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const postBranchSignInOpts = {
    schema: {
        description:'Authenticates and creates a session for a branch',
        tags:['Branches'],        
        body:{
            type:'object',
            required:['code', 'password'],
            properties:{
                code:{type:'string'},
                password:{type:'string'},
            }
        },      
        response: {
            200: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data: {
                        type: 'object',
                        properties: {
                            token: {type: 'string'},
                            branch: branchDef
                        }
                    }
                }
            },
            400: errResponse
        }
    },
    handler: branchLogin

}

function appBranchesRoutes(fastify, options, done) {   
    fastify.post('/branches/in', postBranchSignInOpts)        

done()
}
module.exports = appBranchesRoutes