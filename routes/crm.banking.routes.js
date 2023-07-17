const { createBanking, showBanking, deleteBanking, updateBanking, listBankings } = require('../controllers/banking.controller');
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
        if(!req.headers.authorization){
            return reply.code(401).send({
                status: 'fail',
                message: 'Sesión expirada'
            })            
        }

        const decoded = await req.jwtVerify()
        if (!decoded._id || (decoded.role!='admin') ) {
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
        if(user.role!='admin'){
            return reply.code(401).send({
                status: 'fail',
                message: 'El usuario no tiene autorización'
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

const bankingDef = { 
    type: 'object', 
    properties: {
        _id: { type: 'string' },
        isDeleted:{type:'boolean'}                ,        
        bank: { type: 'string'},
        account: { type: 'string'},
        reference:{type:'string'},
        branchId:{
            _id:{type:'string'},
            name:{type:'string'},
            code:{type:'string'}
        },        
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const postBankingUpOpts = {
    schema: {
        description:'Allows to store a new banking account on database.',
        tags:['Banking account'],
        // headers:{
        //     authorization:{type:'string'}
        // },
        body: {
            type: 'object',
            required:['bank', 'account'],
            properties: {                
                bank: {type:'string'},
                account: { type: 'string' }, 
                reference: { type: 'string'},                
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    data: bankingDef
                }
            },
            400: errResponse
        }
    },
    preHandler: authorizeFunc,
    handler: createBanking,
}

const getSingleBankingOpts={
    schema: {
         description:"Retrieves the information of a single banking account with the id provided in URL.",
         tags:['Banking accounts'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         },         
         response: {
            // 200: {
            //       type: 'object',
            //       properties: {
            //         status: { type: 'string' },
            //         data: bankingDef
            //       }               
            // },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: showBanking,
    
}

const deleteSingleBankingOpts={
    schema: {
         description:"Deletes the banking account with the id provided.",
         tags:['Banking accounts'],
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
    handler: deleteBanking,    
}

const getBankingsOpts={
    schema: {
         description:"Retrieves the information of all the banking accounts stored on the database.",
         tags:['Banking accounts'], 
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
                    items:bankingDef,
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
    handler: listBankings,
    
}

const putSingleBankingOpts={
    schema: {
         description:"Allows to update the information of a single banking account with the id provided.",
         tags:['Banking accounts'],
        //  headers:{
        //     authorization:{type:'string'}
        // },
         params:{
            id:{type:'string'}
         }, 
         body: {
            type: 'object',
            properties: {                                
                bank: { type: 'string' },                
                account: { type: 'string' },              
                reference: { type: 'string' }                
            },
        },      
         response: {
            200: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    data:bankingDef
                  }               
            },
            400: errResponse
        }
         
    },
    preHandler: authorizeFunc,
    handler: updateBanking,
    
}

function bankingRoutes(fastify, options, done) {
    fastify.post('/crm/bankings', postBankingUpOpts)
    fastify.get('/crm/bankings/:id', getSingleBankingOpts)    
    fastify.delete('/crm/bankings/:id', deleteSingleBankingOpts)    
    fastify.get('/crm/bankings', getBankingsOpts)
    fastify.put('/crm/bankings/:id', putSingleBankingOpts)    
    // fastify.delete('/crm/models/:id', deleteSingleModelOpts)
    // fastify.put('/crm/models/:id', putSingleModelOpts)
    // fastify.get('/crm/models/available', getModelsAvailableOpts)         
    done()
}
module.exports = bankingRoutes