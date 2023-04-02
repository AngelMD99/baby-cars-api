const { branchLogin } = require('../controllers/branch.controller');
const { branchRentalsList, branchRentalCashBalance } = require('../controllers/rental.controller');

const errResponse = {
    type: 'object',
    properties: {
        status: { type: 'string' },
        message: {type: 'string'}
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
        createdAt:{type:'string'},
        updatedAt:{type:'string'}        
    }
}

const balanceDef={
    type:'object',
    properties:{
        rentalType:{type:'string'},
        quantity:{type:'number'},
        total:{type:'number'},
        branchName:{type:'string'}
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
    //preHandler: authorizeFunc,
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
    //preHandler: authorizeFunc,
    handler: branchRentalCashBalance,
    
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

function appBranchesRoutes(fastify, options, done) {   
    fastify.post('/branches/in', postBranchSignInOpts) 
    fastify.get('/branches/:id/rentals', getRentalsOpts) 
    fastify.get('/branches/:id/balance', getBalanceOpts) 


done()
}
module.exports = appBranchesRoutes