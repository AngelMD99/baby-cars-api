const Branch = require('../models/Branch');
const User = require('../models/User');
const {  createPayment, showPayment  } = require('../controllers/payment.controller');
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

const paymentDef = { 
    type: 'object',    
    properties: {
        _id: { type: 'string' },
        records:{

        },       
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
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const postPaymentUpOpts = {
    schema: {
        description:'Allows to register a new payment on database.',
        tags:['Payments'],
        // headers:{
        //     authorization:{type:'string'}
        // },
        body: {
            type: 'object',            
            properties: {                
                branchId:{type:'string'},
                carId:{type:'string'},
                planType: {
                      type:'object',
                         properties:{
                           time:{type:'number'},
                           price:{type:'number'}
                         }        
                       
                    },
                paymentType:{type:'string'}
               
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data:paymentDef
 
                }
            },
            400: errResponse
        }
    },
    preHandler: authorizeFunc,
    handler: createPayment,
}

function appPaymentsRoutes(fastify, options, done) {
    fastify.post('/payments', postPaymentUpOpts)
    // fastify.get('/branches/:id/cars', getCarsOpts)
    // fastify.get('/branches/:id/auto-off', autoStopCars)        
    // fastify.get('/branches/:id/available/cars', getAvailableCarsOpts)
    // fastify.get('/branches/:id/available/plans', getAvailablePlansOpts)
    //fastify.put('//:id/start', startSingleCarOpts)
    // fastify.put('/cars/:id/stop', stopSingleCarOpts)            
    //fastify.delete('/crm/branches/:id', getCarsOpts)

done()
}
module.exports = appPaymentsRoutes