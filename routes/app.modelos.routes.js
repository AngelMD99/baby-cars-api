const { modelShow } = require('../controllers/modelo.controller');
const Branch = require('../models/Branch');
const bcrypt = require('bcrypt');

const authorizeFunc = async function (req, reply) {
    try {
        const decoded = await req.jwtVerify()
        // if (!decoded._id || (decoded.role!='admin') ) {
        //     return reply.code(401).send({
        //         status: 'fail',
        //         message: 'invalid_crm_token'
        //     })
        // }
    
        const branch = await Branch.findOne({_id: decoded._id, isDeleted:false});
    
        if(branch == null){
            return reply.code(404).send({
                status: 'fail',
                message: 'sucursal_no_encontrada'
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

const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}

const modelDef = { 
    type: 'object', 
    properties: {
        _id: { type: 'string' },
        isDeleted:{type:'boolean'}                ,        
        name: { type: 'string'},        
        colors:{
             type:'array',
             items:{type:'string'},
        },
        // branchName:{type:'string'},
        // branchCode:{type:'string'},
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const getSingleModelOpts={
    schema: {
         description:"Retrieves the information of a single model with the id provided.",
         tags:['Model'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         },         
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data: modelDef
                  }               
            },
            400: errResponse
        }
         
    },
    //preHandler: authorizeFunc,
    handler: modelShow,
    
}

function appModelsRoutes(fastify, options, done) {    
    fastify.get('/models/:id', getSingleModelOpts)         
done()
}
module.exports = appModelsRoutes
