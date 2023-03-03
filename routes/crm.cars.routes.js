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
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const postCarUpOpts = {
    schema: {
        description:'Allows to store a new branch on database.',
        tags:['Branches'],
        // headers:{
        //     authorization:{type:'string'}
        // },
        body: {
            type: 'object',
            properties: {                
                branchId:{type:'string', minLength:8},
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

function crmCarsRoutes(fastify, options, done) {
    fastify.post('/crm/cars', postCarUpOpts)
    //fastify.get('/crm/branches', getBranchesOpts)
    //fastify.get('/crm/branches/:id', getSingleBranchOpts)    
    //fastify.put('/crm/branches/:id', putSingleBranchOpts)
    //fastify.delete('/crm/branches/:id', deleteSingleBranchOpts)

done()
}
module.exports = crmCarsRoutes