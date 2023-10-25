const { modelCreate, modelShow, modelUpdate, modelDelete, modelList, modelsAvailable, colorsAvailable } = require('../controllers/modelo.controller');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}
const authorizeToken = async function (req, reply) {
    try {
        if(!req.headers.authorization){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sesión expirada'
            })            
        }

        const decoded = await req.jwtVerify()
        if (!decoded._id || (decoded.role.toLowerCase() !='admin' &&  decoded.role.toLowerCase() !='supervisor')  ) {
        //if (!decoded._id || (decoded.role!='admin') ) {
            return reply.code(401).send({
                status: 'fail',
                message: 'Token de usuario no válido'
            })
        }
    
        const user = await User.findOne({_id: decoded._id, isDeleted:false});
    
        if(user == null){
            return reply.code(404).send({
                status: 'fail',
                message: 'Usuario autentificado no encontrado'
            })
        }        
    
        return decoded
    } catch (err) {
      return reply.code(401).send(err)
    }
}
const authorizeFunc = async function (req, reply) {
    try {
        if(!req.headers.authorization){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sesión expirada'
            })            
        }

        const decoded = await req.jwtVerify()
        if (!decoded._id || (decoded.role!='admin') ) {
            return reply.code(401).send({
                status: 'fail',
                message: 'Token de usuario no válido'
            })
        }
    
        const user = await User.findOne({_id: decoded._id, isDeleted:false});
    
        if(user == null){
            return reply.code(404).send({
                status: 'fail',
                message: 'Usuario autentificado no encontrado'
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
                modelColors:{
                    type:'array',
                    items:{
                       type:'object',
                       properties:{
                           color:{type:'string'}
                       }
                   },
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
    preHandler: authorizeFunc,
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
    preHandler: authorizeFunc,
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
                modelColors:{
                    type:'array',
                    items:{
                       type:'object',
                       properties:{
                           color:{type:'string'}
                       }
                   },
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
    preHandler: authorizeFunc,
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
    preHandler: authorizeFunc,
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
    preHandler: authorizeToken,
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
    preHandler: authorizeToken,
    handler: modelsAvailable
    
}

const getColorsAvailableOpts={
    schema: {
         description:"Retrieves the information of all distinct colors registered in models collection.",
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
                    items:{type:'string'},
                  }
                }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeToken,
    handler: colorsAvailable
    
}

function crmModelsRoutes(fastify, options, done) {
    fastify.post('/crm/models', postModelUpOpts)
    fastify.get('/crm/models/:id', getSingleModelOpts)    
    fastify.delete('/crm/models/:id', deleteSingleModelOpts)
    fastify.put('/crm/models/:id', putSingleModelOpts)
    fastify.get('/crm/models/available', getModelsAvailableOpts) 
    fastify.get('/crm/models', getModelsOpts)
    fastify.get('/crm/colors', getColorsAvailableOpts)
     
done()
}
module.exports = crmModelsRoutes