const { branchCreate } = require('../controllers/branch.controller');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}

const authorizeFunc = async function (req, reply) {
    try {
        const decoded = await req.jwtVerify()
        if (!decoded._id || (decoded.role!='admin') ) {
            return reply.code(401).send({
                status: 'fail',
                message: 'invalid_cms_token'
            })
        }
    
        const user = await User.findOne({_id: decoded._id, isDeleted:false});
    
        if(user == null){
            return reply.code(404).send({
                status: 'fail',
                message: 'user_not_found'
            })
        }
        // if(user.isEnabled == false){
        //     return reply.code(404).send({
        //         status: 'fail',
        //         message: 'user_disabled'
        //     })
        // }
    
        return decoded
    } catch (err) {
      return reply.code(401).send(err)
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

const postBranchUpOpts = {
    schema: {
        description:'Allows to store a new branch on database.',
        tags:['Branches'],
        // headers:{
        //     authorization:{type:'string'}
        // },
        body: {
            type: 'object',
            required: [
                'code',
                'password',                
            ],
            properties: {                
                code:{type:'string', minLength:8},
                name: { type: 'string' },
                password: { type: 'string' }, 
                location: { type: 'string'}                               
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data: branchDef
                }
            },
            400: errResponse
        }
    },
    //preHandler: authorizeFunc,
    handler: branchCreate,
}



function crmBranchesRoutes(fastify, options, done) {
    //fastify.get('/cms/branches', getBranchesOpts)
    //fastify.get('/cms/branches/:id', getSingleBranchOpts)
    fastify.post('/crm/branches', postBranchUpOpts)
    //fastify.put('/cms/branches/:id', putSingleBranchOpts)
    //fastify.delete('/cms/branches/:id', deleteSingleBranchOpts)

done()
}
module.exports = crmBranchesRoutes