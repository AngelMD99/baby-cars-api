const Branch = require('../models/Branch');
const bcrypt = require('bcrypt');
const { rentalCreate } = require('../controllers/rental.controller');

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

const rentalDef = { 
    type: 'object',    
    properties: {
        _id: { type: 'string' },
        folio:{type:'string'},
        branchId:{
            type:'object',
            properties:{
                _id:{type:'string'},
                code:{type:'string'},
                name:{type:'string'}
            }
        },
        // branchCode :{type:'string'},
        // branchName: { type: 'string' },        
        carId:{
            _id:{type:'string'},
            name:{type:'string'}
        },
        //carName: { type: 'string'},
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

const postRentalUpOpts = {
    schema: {
        description:'Allows to register a new rental on database.',
        tags:['Rentals'],
        // headers:{
        //     authorization:{type:'string'}
        // },
        body: {
            type: 'object',
            required: ['branchId','carId','planType','paymentType'], 
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
                    data:rentalDef
 
                }
            },
            400: errResponse
        }
    },
    preHandler: authorizeFunc,
    handler: rentalCreate,
}


function appRentalsRoutes(fastify, options, done) {
    fastify.post('/rentals', postRentalUpOpts)
    // fastify.get('/crm/branches', getBranchesOpts)
    // fastify.get('/crm/branches/:id', getSingleBranchOpts)
    
    // fastify.put('/crm/branches/:id', putSingleBranchOpts)
    // fastify.delete('/crm/branches/:id', deleteSingleBranchOpts)

done()
}
module.exports = appRentalsRoutes