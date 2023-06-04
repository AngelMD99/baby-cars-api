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
        branchId:{
            id:{type:'string'},
            name:{type:'string'},
        },
        reference:{type:'string'},
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

function bankingRoutes(fastify, options, done) {
    fastify.post('/crm/bankings', createBanking)
    fastify.get('/crm/bankings/:id', showBanking)    
    fastify.delete('/crm/bankings/:id', deleteBanking)    
    fastify.get('/crm/bankings', listBankings)

    // fastify.delete('/crm/models/:id', deleteSingleModelOpts)
    // fastify.put('/crm/models/:id', putSingleModelOpts)
    // fastify.get('/crm/models/available', getModelsAvailableOpts) 
    
     
done()
}
module.exports = bankingRoutes