const { modelCreate, modelShow, modelUpdate, modelDelete, modelList, modelsAvailable } = require('../controllers/modelo.controller');
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
                message: 'invalid_crm_token'
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

const modelAvailableDef = { 
    type: 'object', 
    properties: {
        modelId: { 
            type: 'object',
            properties:{
                _id:{type:'string'},
                name:{type:'string'},
                colors:{
                    type:'array',
                    items:{type:'string'},
               },
            }
        }                        
    }
}

const postModelUpOpts = {
    schema: {
        description:'Allows to store a new model on database.',
        tags:['Models'],
        // headers:{
        //     authorization:{type:'string'}
        // },
        body: {
            type: 'object',
            required:['name'],
            properties:{                
                name:{type:'string'},
                colors:{
                    type:'array',
                    items:{type:'string'},
               },
            }            
        },
        response: {
            201: {
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
    handler: modelCreate,
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

const putSingleModelOpts={
    schema: {
         description:"Allows to update the information of a single model with the id provided.",
         tags:['Models'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         }, 
         body: {
            type: 'object',
            required:['name'],
            properties: {                                
                name:{type:'string'},
                colors:{
                    type:'array',
                    items:{type:'string'},
               },
            },
        },      
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:modelDef
                  }               
            },
            400: errResponse
        }
         
    },
    //preHandler: authorizeFunc,
    handler: modelUpdate,
    
}

const deleteSingleModelOpts={
    schema: {
         description:"Deletes the model with the id provided.",
         tags:['Models'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         },         
         response: {
            200: {
                type:'object',
                properties:{
                    status:{type:'string'},
                    message:{type:'string'}
                }
            },
            400: errResponse
        }
         
    },
    //preHandler: authorizeFunc,
    handler: modelDelete,
    
}

const getModelsOpts={
    schema: {
         description:"Retrieves the information of all the models stored on the database.",
         tags:['Models'], 
        //  headers:{
        //     authorization:{type:'string'}
        // }, 
        querystring:{
            page:{type:'string'},
            perPage:{type:'string'}
        },
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:{
                    type:'array',
                    items:modelDef,
                  },
                   page:{type:'number'},
                   perPage:{type:'number'},
                   totalDocs:{type:'number'},
                   totalPages:{type:'number'}
                }               
            },
            400: errResponse
        }
         
    },
    //preHandler: authorizeFunc,
    handler: modelList,
    
}

const getModelsAvailableOpts={
    schema: {
         description:"Retrieves the information of all the models options to use them in the form controls.",
         tags:['Models'], 
        //  headers:{
        //     authorization:{type:'string'}
        // }, 
        querystring:{
            page:{type:'string'},
            perPage:{type:'string'}
        },
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:{
                    type:'array',
                    items:modelAvailableDef,
                  }
                }               
            },
            400: errResponse
        }
         
    },
    //preHandler: authorizeFunc,
    handler: modelsAvailable
    
}

function crmModelsRoutes(fastify, options, done) {
    fastify.post('/crm/models', postModelUpOpts)
    fastify.get('/crm/models/:id', getSingleModelOpts)    
    fastify.delete('/crm/models/:id', deleteSingleModelOpts)
    fastify.put('/crm/models/:id', putSingleModelOpts)
    fastify.get('/crm/models/available', getModelsAvailableOpts) 
    fastify.get('/crm/models', getModelsOpts)
     
done()
}
module.exports = crmModelsRoutes