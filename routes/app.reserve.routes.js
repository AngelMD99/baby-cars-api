const Branch = require('../models/Branch');
const User = require('../models/User');
const { reserveCreate, reserveAddPayment, reserveShow, reserveList, reserveAppUpdate  } = require('../controllers/reserve.controller');
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

const reserveDef = { 
    type: 'object',    
    properties: {
        _id: { type: 'string' },
        folio:{type:'string'},
        isPaid:{type:'boolean'},
        isCancelled:{type:'boolean'},        
        cancellationReason:{type:'boolean'},
        isDelivered:{type:'string'},
        branchId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                code:{type:'string'},
                name:{type:'string'}
            }
        },
        client:{
            type:'object',
            properties:{
              fullName:{type:'string'},
              email:{type:'string'},
              phone:{type:'string'}
            }
        },
        employeeId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                fullName:{type:'string'},
                email:{type:'string'},
                phone:{type:'string'}
            }
        }, 
        cancelledBy:{
            type:'object',
            properties:{
                _id:{type:'string'},
                fullName:{type:'string'},
                email:{type:'string'},
                phone:{type:'string'}
            }
        }, 
        deliveredBy:{
            type:'object',
            properties:{
                _id:{type:'string'},
                fullName:{type:'string'},
                email:{type:'string'},
                phone:{type:'string'}
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
                quantity:{type:'number'},
                price:{type:'number'},
                totalAmount:{type:'number'}

              }
            }
        }, 
        totalProducts:{type:'number'},
        differentProducts:{type:'number'},        
        totalSale:{type:'number'},
        payments:{
            type:'array',
            items:{
                isDiscarded:{type:'boolean'},
                amount:{type:'number'},
                paid:{type:'string'},
                paymentType:{type:'string'},

                collectedBy:{
                    type:'object',
                    properties:{
                        _id:{type:'string'},
                        fullName:{type:'string'},
                        email:{type:'string'},
                        phone:{type:'string'}
                    }
                }, 
                

            }


        },
        paymentsCount:{type:'number'},
        totalPaid:{type:'number'},
        pendingBalance:{type:'number'}, 
        cancelledPayments:{
            type:'array',
            items:{
                isDiscarded:{type:'boolean'},
                amount:{type:'number'},
                paid:{type:'string'},
                paymentType:{type:'string'},
                cancellationReason:{type:'string'},
                cancelledBy:{
                    type:'object',
                    properties:{
                        _id:{type:'string'},
                        fullName:{type:'string'},
                        email:{type:'string'},
                        phone:{type:'string'}
                    }
                }, 

            }

        },                           
        cancelledPaymentsCount:{type:'number'},
        expirationDate:{type:'string'},
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}



const postReserveUpOpts = {
    schema: {
        description:'Allows to register a new reserve with optional first payment  on database.',
        tags:['Sales'],
        // headers:{
        //     authorization:{type:'string'}
        // },
        body: {
            type: 'object',            
            properties: {                
                branchId:{type:'string'},                
                userId:{type:'string'},
                client:{
                    type:'object',
                    properties:{
                      fullName:{type:'string'},
                      email:{type:'string'},
                      phone:{type:'string'}
                    }
                },
                employeeId:{type:'string'},                
                products:{
                    type:'array',
                    items:{
                      type:'object',
                      properties:{
                        modelId:{type:'string'},
                        modelName:{type:'string'},
                        color:{type:'string'},
                        quantity:{type:'number'},
                        price:{type:'number'},
                      }
                    }
                },                
                paymentType:{type:'string'},
                amount:{type:'number'},
                expirationDate:{type:'string'} 
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data:reserveDef
 
                }
            },
            400: errResponse
        }
    },
    preHandler:authorizeUserFunc,
    handler: reserveCreate,
}

const getSingleReserveOpts={
    schema: {
         description:"Retrieves the information of a single reserve with the reserveId provided for the id of the branch ",
         tags:['Reserve'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'},
            saleId:{type:'string'}
         },         
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data: reserveDef
                  }               
            },
            400: errResponse
        }
         
    },
    preHandler:authorizeUserFunc,
    handler: reserveShow,
    
}

const getBranchReservesOpts={
    schema: {
         description:"Retrieves the information of all the reserves for the branch with id provided in URL, stored on the database.",
         tags:['Sales'], 
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
                    items:reserveDef,
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
    preHandler:authorizeUserFunc,
    handler: reserveList,
    
}

const putSinglePaymentReserve={
    schema: {
         description:"Adds a single payment to the reserve with reserveId provided in URL branch with branchId provided in URL",
         tags:['Reserves'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         }, 
         body: {
            type: 'object',            
            properties: {                                
                paymentType:{type:'string'},
                amount:{type:'number'},
                paidOn:{type:'string'} 
            },
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
    preHandler:authorizeUserFunc,
    handler: reserveAddPayment,
    
}

const putReserveOpts={
    schema: {
         description:"Allows to update only the client data for a reserve registered with the reserveId provided in the URL",
         tags:['Reserves'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         }, 
         body: {
            type: 'object',            
            properties: {
                client:{
                    type:'object',
                    properties:{
                        fullName:{type:'string'},
                        email:{type:'number'},
                        phone:{type:'string'} 

                    }
                },                                
                
            },
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
    preHandler:authorizeUserFunc,
    handler: reserveAppUpdate,
    
}


function appReserveRoutes(fastify, options, done) {

    fastify.post('/app/:id/reserves', postReserveUpOpts)
    fastify.get('/app/:id/reserves', getBranchReservesOpts)
    fastify.get('/app/:id/reserves/:reserveId', getSingleReserveOpts)
    fastify.put('/app/:id/reserves/:reserveId', putReserveOpts)
    fastify.put('/app/:branchId/reserves/:reserveId/payments', putSinglePaymentReserve)
    // fastify.get('/app/:id/sales', getBranchSalesOpts)
    // fastify.get('/branches/:id/cars', getCarsOpts)
    // fastify.get('/branches/:id/auto-off', autoStopCars)        
    // fastify.get('/branches/:id/available/cars', getAvailableCarsOpts)
    // fastify.get('/branches/:id/inactive/cars', getInactiveCarsOpts)
    // fastify.get('/branches/:id/available/plans', getAvailablePlansOpts)
    // fastify.put('/cars/:id/start', startSingleCarOpts)
    // fastify.put('/cars/:id/stop', stopSingleCarOpts)  
    

    
    //fastify.delete('/crm/branches/:id', getCarsOpts)

done()
}
module.exports = appReserveRoutes