const { statusCreate, statusList, statusDelete, statusUpdate, statusShow } = require('../controllers/status.controller');
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
const statusDef = { 
    type: 'object',    
    properties: {
        _id: { type: 'string' },
        records:{

        },
        totalRecords:{type:'number'}       ,      
        branchId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                code:{type:'string'},
                name:{type:'string'},
            }
        },
        carId: { 
            type: 'object',
            properties:{
                _id:{type:'string'},
                name:{type:'string'},
                color:{type:'string'},
                modelo:{type:'string'}

            }
        },
        modelId: { 
            type: 'object',
            properties:{
                _id:{type:'string'},
                name:{type:'string'},             

            }
        },          
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const getStatusOpts={
    schema: {
         description:"Retrieves the information of all the status of the reles stored on the database.",
         tags:['Status'], 
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
                    items:statusDef,
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
    handler: statusList,
    
}

const getSingleStatusOpts={
    schema: {
         description:"Retrieves the information of a single status with the id provided.",
         tags:['Status'],
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
                  data: statusDef
                  }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: statusShow,
    
}

function crmStatusRoutes(fastify, options, done) {
    // fastify.get('/branches/:id/cars', getCarsOpts)
    fastify.get('/crm/status', getStatusOpts)
    fastify.get('/crm/status/:id', getSingleStatusOpts)
    // fastify.get('/branches/:id/auto-off', autoStopCars)        
    // fastify.get('/branches/:id/available/cars', getAvailableCarsOpts)
    // fastify.get('/branches/:id/available/plans', getAvailablePlansOpts)
    // fastify.put('/cars/:id/start', startSingleCarOpts)
    // fastify.put('/cars/:id/stop', stopSingleCarOpts)            
    //fastify.delete('/crm/branches/:id', getCarsOpts)

done()
}
module.exports = crmStatusRoutes