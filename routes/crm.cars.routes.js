const { carCreate, carDelete, carShow, carStart, carStop, carUpdate, carList } = require('../controllers/car.controller');
const User = require('../models/User');
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
        const decoded = await req.jwtVerify()
        if (!decoded._id || (decoded.role!='admin') ) {
            return reply.code(401).send({
                status: 'fail',
                message: 'invalid_crm_token'
            })
        }
    
        const user = await User.findOne({_id: decoded._id, isDeleted:false});
    
        if(user == null){
            return reply.code(404).send({
                status: 'fail',
                message: 'user_not_found'
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

const carDef = { 
    type: 'object', 
    properties: {
        _id: { type: 'string' },
        isStarted:{type:'string'}                ,
        branchId :{type:'string'},
        ipAddress: { type: 'string' },        
        name: { type: 'string'},
        color: { type: 'string'},
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
        branchName:{type:'string'},
        branchCode:{type:'string'},
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const postCarUpOpts = {
    schema: {
        description:'Allows to store a new car on database.',
        tags:['Cars'],
        // headers:{
        //     authorization:{type:'string'}
        // },
        body: {
            type: 'object',
            properties: {                
                branchId:{type:'string'},
                ipAddress: { type: 'string' },
                name: { type: 'string' }, 
                color: { type: 'string'},                               
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
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data: carDef
                }
            },
            400: errResponse
        }
    },
    //preHandler: authorizeFunc,
    handler: carCreate,
}

const getSingleCarOpts={
    schema: {
         description:"Retrieves the information of a single car with the id provided.",
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
                  data: carDef
                  }               
            },
            400: errResponse
        }
         
    },
    //preHandler: authorizeFunc,
    handler: carShow,
    
}

const putSingleCarOpts={
    schema: {
         description:"Allows to update the information of a single car with the id provided.",
         tags:['Cars'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         }, 
         body: {
            type: 'object',
            properties: {                
                code:{type:'string', minLength:8},
                name: { type: 'string' },
                password: { type: 'string' }, 
                location: { type: 'string'}                               
            },
        },      
         response: {
            200: {
                  type: 'object',
                  properties: {
                  status: { type: 'string' },
                  data:carDef
                  }               
            },
            400: errResponse
        }
         
    },
    //preHandler: authorizeFunc,
    handler: carUpdate,
    
}

const deleteSingleCarOpts={
    schema: {
         description:"Deletes the car with the id provided.",
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
    //preHandler: authorizeFunc,
    handler: carDelete,
    
}

const getCarsOpts={
    schema: {
         description:"Retrieves the information of all the cars stored on the database.",
         tags:['Cars'], 
        //  headers:{
        //     authorization:{type:'string'}
        // }, 
        querystring:{
            page:{type:'number'},
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
    //preHandler: authorizeFunc,
    handler: carList,
    
}

function crmCarsRoutes(fastify, options, done) {
    fastify.post('/crm/cars', postCarUpOpts)
    fastify.get('/crm/cars/:id', getSingleCarOpts)    
    fastify.put('/crm/cars/:id', putSingleCarOpts)
    fastify.delete('/crm/cars/:id', deleteSingleCarOpts)
    fastify.get('/crm/cars', getCarsOpts)
    
    
    //fastify.delete('/crm/branches/:id', deleteSingleBranchOpts)

done()
}
module.exports = crmCarsRoutes