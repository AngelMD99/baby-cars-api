const { inventoryCreate, inventoryList, inventoryUpdate, inventoryDelete   } = require('../controllers/inventory.controller');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
    }
}

const inventoryDef ={
    type:'object',
    properties:{
        _id:{type:'string'},
        modelId :{
            type:'object',
            properties:{
                _id:{type:'string'},             
                name:{type:'string'},
            }
        },
        color:{type:'string'},
        quantity:{type:'number'},
        createdAt:{type:'string'},
        updatedAt:{type:'string'}   


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

        if(user.role!='admin'){
            return reply.code(401).send({
                status: 'fail',
                message: 'El usuario no tiene autorización'
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

const postInventoryOpts = {
    schema: {
        description:'Allows to store a inventory registry on database.',
        tags:['Inventory'],
        headers:{
            authorization:{type:'string'}
        },
        body: {
            type: 'object',
            properties: {                
                modelId: {type:'string'},                
                color: { type: 'string'},                
                quantity: { type: 'number' },
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data: inventoryDef
                }
            },
            400: errResponse
        }
    },
    preHandler: authorizeFunc,
    handler: inventoryCreate,
}

function crmInventoryRoutes(fastify, options, done) {
    // fastify.get('/branches/:id/cars', getCarsOpts)
    // fastify.get('/branches/:id/auto-off', autoStopCars)        
    // fastify.get('/branches/:id/available/cars', getAvailableCarsOpts)
    // fastify.get('/branches/:id/available/plans', getAvailablePlansOpts)
    // fastify.put('/cars/:id/start', startSingleCarOpts)
    // fastify.put('/cars/:id/stop', stopSingleCarOpts)            
    fastify.post('/crm/inventory', postInventoryOpts)

done()
}
module.exports = crmInventoryRoutes