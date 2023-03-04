const { rentalsReport } = require('../controllers/report.controller');
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

const getRentalsReportOpts={
    schema: {
         description:"Retrieves a MS Excel file with the information of the rentals for the products, if branchId, initialData and lastDate are provided on query params, the rentals will be filtered according to them.",
         tags:['Reports'], 
        //  headers:{
        //     authorization:{type:'string'}
        // },
        querystring:{
            carId:{type:'string'},
            branchId:{type:'string'},
            initialDate:{type:'string'},
            lastDate:{type:'string'}
        }, 
        response: {
            200: {
            //     description:'An XLS file',            
                 type:'string',
                 format:'binary',
                 //content: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                    
            },
            400: errResponse
        }
         
    },
    //preHandler: authorizeFunc,
    handler: rentalsReport
    
}

function crmReportsRoutes(fastify, options, done) {
    fastify.get('/crm/reports/rentals', getRentalsReportOpts)
    // fastify.get('/crm/branches/:id', getSingleBranchOpts)
    // fastify.post('/crm/branches', postBranchUpOpts)
    // fastify.put('/crm/branches/:id', putSingleBranchOpts)
    // fastify.delete('/crm/branches/:id', deleteSingleBranchOpts)

done()
}
module.exports = crmReportsRoutes