const Branch = require('../models/Branch');
const User = require('../models/User');
const { clientCreate, clientSearch, clientDelete, clientUpdate, clientShow, clientList   } = require('../controllers/client.controller');
const { plansAvailable } = require('../controllers/branch.controller')
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

        if(!req.headers.authorization){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sesión expirada'
            })
            
        }

        const decoded = await req.jwtVerify()
        // if (!decoded._id || (decoded.role!='admin') ) {
        //     return reply.code(401).send({
        //         status: 'fail',
        //         message: 'invalid_crm_token'
        //     })
        // }
    
        const branch = await Branch.findOne({_id: decoded._id, isDeleted:false});
    
        if(branch == null){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sucursal autentificada no existe'
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

const authorizeUserFunc = async function (req, reply) {
    try {

        if(!req.headers.authorization){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sesión expirada'
            })            
        }
        const decoded = await req.jwtVerify()      
        const user = await User.findOne({_id: decoded._id, isDeleted:false});        
        if(user == null){
            return reply.code(401).send({
                status: 'fail',
                message: 'Usuario autentificado no existe'
            })             
        }
        if(user.isEnabled == false){
            return reply.code(404).send({
                status: 'fail',
                message: 'Usuario deshabilitado'
            })
        }
    
        return decoded
    } catch (err) {
      return reply.code(401).send(err)
    }
}

const clientDef = { 
    type: 'object',    
    properties: {
        _id: { type: 'string' },
        fullName:{type:'string'},       
        phone: { type: 'string'},        
        email:{type:'string'},       
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const postClientUpOpts = {
    schema: {
        description:'Allows to register a new client on database.',
        tags:['Clients'],
        // headers:{
        //     authorization:{type:'string'}
        // },
        body: {
            type: 'object',            
            properties: {                
                fullName:{type:'string'},
                phone:{type:'string'},                
                email:{type:'string'}               
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data:clientDef
 
                }
            },
            400: errResponse
        }
    },
    preHandler: authorizeFunc,
    handler: clientCreate,
}

const getSingleClientOpts={
    schema: {
         description:"Retrieves the information of a single client with the id provided.",
         tags:['Clients'],
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
                  data: clientDef
                  }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: clientShow,
    
}

const deleteSingleClientOpts={
    schema: {
         description:"Deletes the client with the id provided.",
         tags:['Clients'],
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
    handler: clientDelete,
    
}

const putSingleClientOpts={
    schema: {
         description:"Allows to update the information of a single client with the id provided.",
         tags:['Clients'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         }, 
         body: {
            type: 'object',
            properties: {                                
                fullName: { type: 'string' },                
                email: { type: 'string' },              
                phone: { type: 'string' },                 

            },
        },      
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:clientDef
                  }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: clientUpdate,
    
}

const getClientsOpts={
    schema: {
         description:"Retrieves the information of all the clients stored on the database.",
         tags:['Clients'], 
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
                    items:clientDef,
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
    handler: clientList,
    
}


function appClientsRoutes(fastify, options, done) {
    fastify.post('/app/clients', postClientUpOpts)
    fastify.get('/app/clients', getClientsOpts)
    fastify.get('/app/clients/:id', getSingleClientOpts)
    fastify.delete('/app/clients/:id', deleteSingleClientOpts)
    fastify.put('/app/clients/:id', putSingleClientOpts)
   
    // fastify.get('/branches/:id/auto-off', autoStopCars)        
    // fastify.get('/branches/:id/available/cars', getAvailableCarsOpts)
    // fastify.get('/branches/:id/available/plans', getAvailablePlansOpts)
    // fastify.put('/cars/:id/start', startSingleCarOpts)
    // fastify.put('/cars/:id/stop', stopSingleCarOpts)            
    //fastify.delete('/crm/branches/:id', getCarsOpts)

done()
}
module.exports = appClientsRoutes