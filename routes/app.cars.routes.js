const Branch = require('../models/Branch');
const User = require('../models/User');
const { carList, carStart, carStop, carsAvailable,carBranchAutoOff, carsTurnedOff  } = require('../controllers/car.controller');
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

const carDef = { 
    type: 'object', 
    properties: {
        _id: { type: 'string' },
        isStarted:{type:'boolean'}                ,
        branchId :{
            type:'object',
            properties:{
                _id:{type:'string'},
                code:{type:'string'},
                name:{type:'string'}
            }
        },        
        ipAddress: { type: 'string' },
        modelId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                name:{type:'string'}

            }
        },        
        name: { type: 'string'},
        color: { type: 'string'},
        // plans:{
        //      type:'array',
        //      items:
        //         {
        //          type:'object',
        //           properties:{
        //             time:{type:'number'},
        //             price:{type:'number'}
        //           }        
                
        //      }
        // },
        // branchName:{type:'string'},
        // branchCode:{type:'string'},
        startDate:{type:'string'},
        expireDate:{type:'string'},
        rentalTime:{type:'number'},
        remainingTime:{type:'number'},
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const carAvailableDef = { 
    type: 'object', 
    properties: {
        carId: { 
            type: 'object',
            properties:{
                _id:{type:'string'},
                name:{type:'string'},                
                color:{type:'string'},
                isStarted:{type:'boolean'},
                ipAddress:{type:'string'}         
            }
        
        },
        modelId :{
            type:'object',
            properties:{
                _id:{type:'string'},             
                name:{type:'string'},
            }
        },
    }
}

const modelAvailableDef = { 
    type: 'object', 
    properties: {
        _id:{type:'string'},
        name:{type:'string'},
        count:{type:'number'},
        branchAvailable:{type:'boolean'}        
    }
}

const planAvailableDef = { 
    type: 'object', 
    properties: {
        planId: { 
            type: 'object',
            properties:{
                time:{type:'number'},
                price:{type:'number'}         
            }
        }                        
    }
}

const getAvailablePlansOpts={
    schema: {
         description:"Retrieves the available plans for the branch in order to be used on the forms control interfaces.",
         tags:['Branches'], 
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
                  data:{
                    type:'array',
                    items:planAvailableDef
                  }
                }               
            },
            400: errResponse
        }
         
    },
    preHandler:authorizeUserFunc,
    handler: plansAvailable,
    
}

const getAvailableCarsOpts={
    schema: {
         description:"Retrieves the available cars for the branch in order to be used on the forms control interfaces.",
         tags:['Cars'], 
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
                  data:{
                    type:'array',
                    items:carAvailableDef
                  },
                  models:{
                    type:'array',
                    items:modelAvailableDef                    
                  },
                  colors:{
                    type:'array',
                    items:{
                        type:'object',
                        properties:{
                            color:{type:'string'},
                            branchAvailable:{type:'boolean'}
                        }
                    }

                  }

                }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeUserFunc,
    handler: carsAvailable,
    
}

const getInactiveCarsOpts={
    schema: {
         description:"Retrieves the turned off cars for the branch in order to be used to check the status of the rele",
         tags:['Cars'], 
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
                  data:{
                    type:'array',
                    items:carAvailableDef
                  },                
                  
                }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeUserFunc,
    handler: carsTurnedOff,
    
}

const getCarsOpts={
    schema: {
         description:"Retrieves the information of all the cars related to the branch with the id provided in URL stored on the database .",
         tags:['Cars'], 
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
                    items:carDef,
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
    preHandler: authorizeUserFunc,
    handler: carList,
    
}

const startSingleCarOpts={
    schema: {
         description:"Turns on the car with the id provided and set the isStarted field to true.",
         tags:['Cars'],
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
    preHandler: authorizeUserFunc,
    handler: carStart,
    
}

const stopSingleCarOpts={
    schema: {
         description:"Turns off the car with the id provided and set the isStarted field to false.",
         tags:['Cars'],
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
    preHandler: authorizeUserFunc,
    handler: carStop,
    
}

const autoStopCars={
    schema: {
         description:"Turns off all the cars with rental time expired.",
         tags:['Cars'],
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
                    data:{
                        turnedOffCars:{type:'number'},
                        carsIps:{
                            type:'array',
                            items:{
                                type:'string'
                            }
                        }
                    }
                }
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeUserFunc,
    handler: carBranchAutoOff
    
}

function appCarsRoutes(fastify, options, done) {
    fastify.get('/branches/:id/cars', getCarsOpts)
    fastify.get('/branches/:id/auto-off', autoStopCars)        
    fastify.get('/branches/:id/available/cars', getAvailableCarsOpts)
    fastify.get('/branches/:id/inactive/cars', getInactiveCarsOpts)
    fastify.get('/branches/:id/available/plans', getAvailablePlansOpts)
    fastify.put('/cars/:id/start', startSingleCarOpts)
    fastify.put('/cars/:id/stop', stopSingleCarOpts)  
    

    
    //fastify.delete('/crm/branches/:id', getCarsOpts)

done()
}
module.exports = appCarsRoutes