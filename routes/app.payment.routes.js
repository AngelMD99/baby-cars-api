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

const paymentDef={
    type:'object',
    properties: {
        _id:{type:'string'},
        isDiscarded:{type:'string'},
        fullName:{type:'string'},
        email:{type:'string'},
        contactLastName:{type:'string'},
        role:{type:'string'},
        operationType:{type:'string'},
        branchId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                name:{type:'string'},
                code:{type:'string'}
            }
        },
        saleId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                folio:{type:'string'},
                client:{
                    type:'object',
                    properties:{
                        fullName:{type:'string'},
                        phone:{type:'string'},
                        email:{type:'string'}
                    }
                },
                products:{
                    type:'array',
                    items:{
                        type:'object',
                        properties:{
                           modelId:{type:'string'},
                           modelName:{type:'string'},
                           color:{type:'string'},
                           price:{type:'number'},
                           quantity:{type:'number'},
                        }
                    }
                },
                totalSale:{type:'number'},
                createdAt:{type:'string'},
                updatedAt:{type:'string'}               

            }
        },  
        reserveId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                isDeleted:{type:'boolean'},
                isPaid:{type:'boolean'},
                isCancelled:{type:'boolean'},                
                folio:{type:'string'},
                client:{
                    type:'object',
                    properties:{
                        fullName:{type:'string'},
                        phone:{type:'string'},
                        email:{type:'string'}
                    }
                },
                products:{
                    type:'array',
                    items:{
                        type:'object',
                        properties:{
                           modelId:{type:'string'},
                           modelName:{type:'string'},
                           color:{type:'string'},
                           price:{type:'number'},
                           quantity:{type:'number'},
                        }
                    }
                },
                totalSale:{type:'number'},
                expirationDate:{type:'string'},
                createdAt:{type:'string'},
                updatedAt:{type:'string'}               

            }
        },
        collectedBy:{
            type:'object',
            properties:{
                _id:{type:'string'},
                fullName:{type:'string'},
                email:{type:'string'},
                phone:{type:'string'},


            }
        }, 

        paidOn:{type:'string'},              
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
    preHandler:authorizeUserFunc,
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