const { reserveCreate, reserveAddPayment, reserveShow, reserveList, reserveShowCrm, reserveCancel  } = require('../controllers/reserve.controller');
const bcrypt = require('bcrypt');
const User = require('../models/User');
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
        if (!decoded._id || (decoded.role!='admin' && decoded.role!='supervisor') ) {
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

const reserveDef = { 
    type: 'object',    
    properties: {
        _id: { type: 'string' },
        folio:{type:'string'},
        isPaid:{type:'boolean'},
        isCancelled:{type:'boolean'},        
        cancellationReason:{type:'boolean'},
        isDelivered:{type:'boolean'},
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
              }
            }
        },         
        totalSale:{type:'number'},
        payments:{
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
        createdAt:{type:'string'},
        expirationDate:{type:'string'},
        updatedAt:{type:'string'}        
    }
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
    preHandler: authorizeFunc,
    handler: reserveShowCrm,
    
}

const cancelSingleReserveOpts={
    schema: {
         description:"Cancels the reserve with the id provided.",
         tags:['Reserves'],
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
    handler: reserveCancel,
    
}

const getReservesOpts={
    schema: {
         description:"Retrieves the information of all the reserves stored on the database.",
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
    preHandler: authorizeFunc,
    handler: reserveList,
    
}

function crmReserveRoutes(fastify, options, done) {

    //fastify.post('/app/:id/reserves', postReserveUpOpts)
    fastify.get('/crm/reserves/:reserveId', getSingleReserveOpts)
    fastify.get('/crm/reserves', getReservesOpts)
    fastify.delete('/crm/reserves/:reserveId', cancelSingleReserveOpts)
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
module.exports = crmReserveRoutes