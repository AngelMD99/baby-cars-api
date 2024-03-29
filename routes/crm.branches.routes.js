const { branchCreate, branchShow, branchDelete,branchList, branchUpdate, branchesAvailable } = require('../controllers/branch.controller');
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
        if (!decoded._id || decoded.role.toLowerCase() !='admin'  ) {
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

const branchAvailableDef = { 
    type: 'object', 
    properties: {
        branchId: { 
            type: 'object',
            properties:{
                _id:{type:'string'},
                isDeleted:{type:'boolean'},
                name:{type:'string'},
                code:{type:'string'},

            }
        }                
        
    }
}

const branchDef = { 
    type: 'object', 
    properties: {
        _id: { type: 'string' },                
        code :{type:'string'},
        name: { type: 'string' },        
        location: { type: 'string'},
        plans:{
            type:'array',
            items:
               {
                type:'object',
                 properties:{
                   time:{type:'number'},
                   price:{type:'number'}
                 }        
               
            }
       },
       banking:{
        type:'object',
        properties:{
            _id:{type:'string'},
            bank:{type:'string'},
            account:{type:'string'},
            reference:{type:'string'},
            
        }
       },
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
                code:{type:'string'},
                name: { type: 'string' },
                password: { type: 'string' }, 
                location: { type: 'string'} ,
                plans:{
                    type:'array',
                    items:
                       {
                        type:'object',
                         properties:{
                           time:{type:'number'},
                           price:{type:'number'}
                         }        
                       
                    }
               },                              
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
    preHandler: authorizeFunc,
    handler: branchCreate,
}

const getSingleBranchOpts={
    schema: {
         description:"Retrieves the information of a single branch with the id provided.",
         tags:['Branches'],
         headers:{
            authorization:{type:'string'}
        },
         params:{
            id:{type:'string'}
         },         
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data: branchDef
                  }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: branchShow,
    
}

const putSingleBranchOpts={
    schema: {
         description:"Allows to update the information of a single branch with the id provided.",
         tags:['Branches'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         }, 
         body: {
            type: 'object',
            properties: {                
                code:{type:'string'},
                name: { type: 'string' },
                password: { type: 'string' }, 
                location: { type: 'string'},
                plans:{
                    type:'array',
                    items:
                       {
                        type:'object',
                         properties:{
                           time:{type:'number'},
                           price:{type:'number'}
                         }        
                       
                    }
               },                              
            },
        },      
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:branchDef
                  }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: branchUpdate,
    
}

const deleteSingleBranchOpts={
    schema: {
         description:"Deletes the branch with the id provided.",
         tags:['Branches'],
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
    handler: branchDelete,
    
}

const getBranchesOpts={
    schema: {
         description:"Retrieves the information of all the branches stored on the database.",
         tags:['Branches'], 
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
                    items:branchDef,
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
    preHandler: authorizeFunc,
    handler: branchList,
    
}

const getAvailableBranchesOpts={
    schema: {
         description:"Retrieves the available branches in order to be used on the forms control interfaces.",
         tags:['Branches'], 
        //  headers:{
        //     authorization:{type:'string'}
        // },         
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:{
                    type:'array',
                    items:branchAvailableDef
                  }
                }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeToken,
    handler: branchesAvailable,
    
}



function crmBranchesRoutes(fastify, options, done) {
    fastify.get('/crm/available/branches', getAvailableBranchesOpts)
    fastify.get('/crm/branches', getBranchesOpts)
    fastify.get('/crm/branches/:id', getSingleBranchOpts)
    fastify.post('/crm/branches', postBranchUpOpts)
    fastify.put('/crm/branches/:id', putSingleBranchOpts)
    fastify.delete('/crm/branches/:id', deleteSingleBranchOpts)

done()
}
module.exports = crmBranchesRoutes