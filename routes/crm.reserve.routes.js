const { reserveCreate, reserveAddPayment, reserveShow, reserveList  } = require('../controllers/reserve.controller');
const bcrypt = require('bcrypt');
const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
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
        createdAt:{type:'string'},
        expirationDate:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

function crmReserveRoutes(fastify, options, done) {

    //fastify.post('/app/:id/reserves', postReserveUpOpts)
    fastify.get('/app/:id/reserves/:reserveId', getSingleReserveOpts)
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