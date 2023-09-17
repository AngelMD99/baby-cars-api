const Branch = require('../models/Branch');
const User = require('../models/User');
const { branchLogin } = require('../controllers/branch.controller');
const { branchRentalsList, branchRentalCashBalance } = require('../controllers/rental.controller');
const { statusCreate, statusDelete, statusList, statusUpdate } = require('../controllers/status.controller');
const { batteryCreate } = require('../controllers/battery.controller');
const { balanceShow, balanceRentalsCreate, balanceList, balancePaymentsCreate, balanceVerifications } = require('../controllers/balance.controller');

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

// const balanceDef={
//     type:'object',
//     properties: {
//         _id:{type:'string'}, 
//         balanceType:{type:'string'}                              ,
//         amount:{type:'number'},
//         loginDate:{type:'number'},
//         logoutDate:{type:'number'},
//         userId:{
//             type:'object',
//             properties:{
//                 _id:{type:'string'},
//                 fullName:{type:'string'},
//                 email:{type:'string'}
//             }
//         },                
//         branchId:{
//             type:'object',
//             properties:{
//                 _id:{type:'string'},
//                 name:{type:'string'},
//                 code:{type:'string'}
//             }
//         },                
//         createdAt:{type:'string'},
//         updatedAt:{type:'string'}
//       }

// }

const balanceDef={
    type:'object',
    properties: {
        _id:{type:'string'},
        folio:{type:'string'} ,
        balanceType:{type:'string'}                              ,
        amount:{type:'number'},
        quantity:{type:'number'},
        loginDate:{type:'number'},
        balanceDate:{type:'number'},
        userId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                fullName:{type:'string'},
                email:{type:'string'}
            }
        },                
        branchId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                name:{type:'string'},
                code:{type:'string'}
            }
        },                
        createdAt:{type:'string'},
        updatedAt:{type:'string'}
      }

}

const rentalDef = { 
    type: 'object',    
    properties: {
        _id: { type: 'string' },                
        folio: { type: 'string' },                
        branchCode :{type:'string'},
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
                name:{type:'string'}

            }
        },
        planType: { 
            type: 'object',
            properties:{
                time:{type:'number'},
                price:{type:'number'}
            }
        },
        paymentType: { type: 'string'},
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const getRentalsOpts={
    schema: {
         description:"Retrieves the list of the rentals of current day for the branch with the id provided in URL",
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
                    items:rentalDef,
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
    handler: branchRentalsList,
    
}



const getBalanceOpts={
    schema: {
         description:"The total of the daily rentals paid in cash for the branch with the id in the URL",
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
                  data:balanceDef

                }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: branchRentalCashBalance,
    
}

const putBranchStatusOpt = {
    schema: {
        description:'Updates the status of the rele of the all the cars in the array received',
        tags:['Branches'],        
        body:{
            type:'object',
            required:['carsArray'],
            properties:{
                carsArray:{
                    type:'array',
                    items:{
                        type:'object',
                        properties:{
                            carId:{type:'string'},
                            value:{type:'string'},
                            dateTime:{type:'string'}
                            
                        }
                    }
                },
                
            }
        },      
        response: {
            200: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    message:{ type: 'string'}
                }
            },
            400: errResponse
        }
    },
    preHandler: authorizeFunc,
    handler: statusCreate

}

const putBatteryStatusOpt = {
    schema: {
        description:'Updates the status of the rele of the all the cars in the array received',
        tags:['Branches'],        
        body:{
            type:'object',
            required:['carsArray'],
            properties:{
                carsArray:{
                    type:'array',
                    items:{
                        type:'object',
                        properties:{
                            carId:{type:'string'},
                            value:{type:'string'},
                            dateTime:{type:'string'}
                            
                        }
                    }
                },
                
            }
        },      
        response: {
            200: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    message:{ type: 'string'}
                }
            },
            400: errResponse
        }
    },
    preHandler: authorizeFunc,
    handler: batteryCreate

}

const postBranchSignInOpts = {
    schema: {
        description:'Authenticates and creates a session for a branch',
        tags:['Branches'],        
        body:{
            type:'object',
            required:['code', 'password'],
            properties:{
                code:{type:'string'},
                password:{type:'string'},
            }
        },      
        response: {
            200: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data: {
                        type: 'object',
                        properties: {
                            token: {type: 'string'},
                            branch: branchDef
                        }
                    }
                }
            },
            400: errResponse
        }
    },
    handler: branchLogin

}

const postRentalBalanceOpts={
    schema: {
         description:"Calculates the balance of rentals since time date and time logged users logged in to current date",
         tags:['Branches'], 
        //  headers:{
        //     authorization:{type:'string'}
        // }, 
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:balanceDef

                }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeUserFunc,
    handler: balanceRentalsCreate,
    
}

const postPaymentBalanceOpts={
    schema: {
         description:"Calculates the balance of rentals since time date and time logged users logged in to current date",
         tags:['Branches'], 
        //  headers:{
        //     authorization:{type:'string'}
        // }, 
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:balanceDef

                }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeUserFunc,
    handler: balancePaymentsCreate,    
}

const getSingleBalanceOpts={
    schema: {
         description:"Retrieves the balance in the database with the balance id provided in URL",
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
                  data:balanceDef

                }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeUserFunc,
    handler: balanceShow,
    
}

const getBalanceValidationOpts={
    schema: {
         description:"Checks if the balances of the logged user for the branchId in URL is valid",
         tags:['Branches'], 
        //  headers:{
        //     authorization:{type:'string'}
        // }, 
         response: {
            200: errResponse,
            400: errResponse
        }
         
    },
    preHandler: authorizeUserFunc,
    handler: balanceVerifications,
    
}

function appBranchesRoutes(fastify, options, done) {   
    fastify.post('/branches/in', postBranchSignInOpts) 
    fastify.get('/branches/:id/rentals', getRentalsOpts) 
    fastify.get('/branches/:id/verifybalances', getBalanceValidationOpts) 
    fastify.get('/branches/:id/balance', getBalanceOpts)     
    fastify.post('/branches/:id/balance/rentals', postRentalBalanceOpts)    
    fastify.post('/branches/:id/balance/payments', postPaymentBalanceOpts)
    fastify.get('/branches/:id/balance/:balanceId', getSingleBalanceOpts) 
    fastify.put('/branches/:id/status', putBranchStatusOpt) 
    fastify.put('/branches/:id/battery', putBatteryStatusOpt) 



done()
}
module.exports = appBranchesRoutes