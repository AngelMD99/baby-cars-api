const bcrypt = require('bcrypt');
const { rentalShow, rentalList } = require('../controllers/rental.controller');
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
        const decoded = await req.jwtVerify()
        if (!decoded._id || (decoded.role!='admin') ) {
            return reply.code(401).send({
                status: 'fail',
                message: 'token_de_usuario_no_valido'
            })
        }
    
        const user = await User.findOne({_id: decoded._id, isDeleted:false});
    
        if(user == null){
            return reply.code(404).send({
                status: 'fail',
                message: 'usuario_no_encontrado'
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

const rentalDef = { 
    type: 'object',    
    properties: {
        _id: { type: 'string' },                
        branchCode :{type:'string'},
        branchName: { type: 'string' },        
        carName: { type: 'string'},
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

const getSingleRentalOpts={
    schema: {
         description:"Retrieves the information of a single rental with the id provided.",
         tags:['Rentals'],
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
                  data: rentalDef
                  }               
            },
            400: errResponse
        }
         
    },
    //preHandler: authorizeFunc,
    handler: rentalShow,
    
}

const getRentalsOpts={
    schema: {
         description:"Retrieves the information of all the rentals stored on the database.",
         tags:['Rentals'], 
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
    //preHandler: authorizeFunc,
    handler: rentalList,
    
}

function crmRentalsRoutes(fastify, options, done) {
    fastify.get('/crm/rentals', getRentalsOpts)
    fastify.get('/crm/rentals/:id', getSingleRentalOpts)
    // fastify.get('/crm/branches/:id', getSingleBranchOpts)
    
    // fastify.put('/crm/branches/:id', putSingleBranchOpts)
    // fastify.delete('/crm/branches/:id', deleteSingleBranchOpts)

done()
}
module.exports = crmRentalsRoutes