const Branch = require('../models/Branch');
const { carList } = require('../controllers/car.controller');
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
        // if (!decoded._id || (decoded.role!='admin') ) {
        //     return reply.code(401).send({
        //         status: 'fail',
        //         message: 'invalid_crm_token'
        //     })
        // }
    
        const branch = await Branch.findOne({_id: decoded._id, isDeleted:false});
    
        if(branch == null){
            return reply.code(404).send({
                status: 'fail',
                message: 'sucursal_no_encontrada'
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
        // branchName:{type:'string'},
        // branchCode:{type:'string'},
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
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
    //preHandler: authorizeFunc,
    handler: carList,
    
}

function appCarsRoutes(fastify, options, done) {
    fastify.get('/branches/:id/cars', getCarsOpts)    
    
    //fastify.delete('/crm/branches/:id', getCarsOpts)

done()
}
module.exports = appCarsRoutes