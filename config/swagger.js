exports.options = {
    routePrefix: '/documentation',
    exposeRoute: true,
    swagger: {
      info: {
        title: 'Baby Cars API',
        description: 'API services for baby cars mobile and web applications'
      },
      tags: [
        { name: 'General', description: 'General  and base end-points' },
        { name: 'Users', description: 'Users related end-points' },            
        { name: 'Branches', description: 'Branches related end-points' } , 
        { name: 'Cars', description: 'Cars related end-points' } ,               
        { name: 'Rentals', description: 'Rentals related end-points' },            
        { name: 'Banking accounts', description: 'Banking accounts related end-points' },            
        { name: 'Inventories', description: 'Inventories related end-points' },            
        { name: 'Batteries', description: 'Batteries related end-points' },            
        { name: 'Status', description: 'Status related end-points' },            
        { name: 'Clients', description: 'Clients related end-points' },            
        { name: 'Models', description: 'Models related end-points' },            
        { name: 'Reserves', description: 'Reserves related end-points' },            
        { name: 'Sales', description: 'Sales related end-points' },
        { name: 'Payments', description: 'Payments related end-points' },                        
        


                
      ],
      definitions: {      
        users: {
          type: 'object',
          required: ['email', 'password','role'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            role:{
                type:'string',
                enum:['admin','employee']
            },
            fullName:{type:'string'},
            email:{type:'string'},
            password:{type:'string'},
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }
        },
        branches: {
          type: 'object',
          required: ['name','password','code'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            name:{type:'string'},
            code:{type:'string'},
            password:{type:'string'},
            location:{type:'string'},
            plans:{
              type:'array',
              items:{ 
                  type:'object',
                  properties:{
                      time:{
                          type:'number'                        
                      },
                      price:{
                          type:'number'                         
                      }                       
                  }
              }
          },                
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }
        },
        models:{
          type: 'object',
          required: ['name'],
          properties: {
            _id:{type:'string'},                                    
            name:{type:'string'},          
            colors:{
              type:'array',
              items:{
                type:'string'
              }
            },                    
            
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }

        },


        cars: {
          type: 'object',
          required: ['ipAddress'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},            
            isStarted:{type:'boolean'}, 
            modelId:{type:'string'},
            name:{type:'string'},         
            color:{type:'string'},                   
            branchId:{type:'string'},
            startsDate:{type:'string'},
            expiresDate:{type:'string'},
            remainingMinutes:{type:'number'},            
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }
        },

        rentals: {
          type: 'object',
          required: ['branchId', 'carId','plan','paymentType'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},                        
            folio:{type:'boolean'},
            branchId:{type:'string'},
            carId:{type:'string'},
            planType:{
                type:'object',
                properties:{
                    time:{type:'number'},
                    price:{type:'number'}
                }
            },                    
            paymentType:{type:'string'},
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }
        },
        bankings:{
          type: 'object',
          required: ['bank','account'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            bank:{type:'string'},          
            account:{type:'string'},          
            branchId:{type:'string'},         
            reference:{type:'string'},                    
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }

        },

        status:{
          type: 'object',
          required: ['carId'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            carId:{type:'string'}, 
            records:{
              type:'array',
              items:{
                type:'object',
                properties:{
                  value:{type:'number'},
                  dateTime:{type:'timestamp'}

                }
              }
            },
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }
        },

        battery:{
          type: 'object',
          required: ['carId'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            carId:{type:'string'}, 
            records:{
              type:'array',
              items:{
                type:'object',
                properties:{
                  value:{type:'number'},
                  dateTime:{type:'timestamp'}

                }
              }
            },
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}                     
          }
          
        },
        inventory:{
          type: 'object',
          required: ['modelId'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            modelId:{type:'string'}, 
            color:{type:'string'},
            quantity:{type:'number'},
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}           
          }
        },

        sales: {
          type: 'object',
          required: ['branchId','saleType','modelId'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},                        
            folio:{type:'boolean'},
            employeeId:{type:'string'},
            clientId:{type:'string'},
            branchId:{type:'string'},
            modelId:{type:'string'},
            color:{type:'string'},
            reserveId:{type:'string'},
            price:{type:'number'},                               
            payments:{
              type:'array',
              items:{
                type:'object',
                properties:{
                  amount:{type:'number'},
                  paidOn:{type:'number'},
                  paymentType:{type:'string'}

                }
              }
            },
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}
          }
        },
        
        clients:{
          type: 'object',
          required: ['fullName','phone'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            fullName:{type:'string'}, 
            phone:{type:'string'}, 
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}           
          }
        },

        reserves:{
          type: 'object',
          required: ['modelId','clientId'],
          properties: {
            _id:{type:'string'},
            folio:{type:'string'},
            isDeleted:{type:'boolean'},
            modelId:{type:'string'}, 
            clientId:{type:'string'},
            branchId:{type:'string'},
            employeeId:{type:'string'},
            color:{type:'string'},
            quantity:{type:'number'},
            price:{type:'number'},
            totalSale:{type:'number'},
            pendingBalance:{type:'number'},
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}           
          }
        },        
        payments:{
          type: 'object',
          required: ['amount','paidOn','operationType'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            modelId:{type:'string'}, 
            clientId:{type:'string'},
            branchId:{type:'string'},
            employeeId:{type:'string'},
            color:{type:'string'}, 
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}           
          }
        },  
        balances:{
          type: 'object',
          required: ['amount','branchId','userId','loginDate','logoutDate'],
          properties: {
            _id:{type:'string'},
            isDeleted:{type:'boolean'},
            userId:{type:'string'},             
            branchId:{type:'string'},
            quantity:{type:'number'},
            amount:{type:'number'},
            loginDate:{type:'timestamp'},
            logoutDate:{type:'timestamp'},
            createdAt:{type:'timestamp'},
            updatedAt:{type:'timestamp'}           
          }
        },      
      }
    }
  }