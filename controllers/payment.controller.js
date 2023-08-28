const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const createPayment = async function (req, reply){

}

const showPayment = async function (req, reply){

}

const listPayments = async function (req, reply){
    
    let searchQuery = {
        isDeleted: false,			
    };
    if(req.params.id && !req.query.branchId){
        searchQuery['branchId']=req.params.id
    }

    if(!req.params.id && req.query.branchId){
        searchQuery['branchId']=req.query.branchId
    }
    if(req.query.employeeId){
        searchQuery['employeeId']=req.query.employeeId
    }
    // if(req.query.modelId){
    //     searchQuery['products.modelId']=req.query.modelId
    // }

    if (req.query.initialDate!=null && req.query.finalDate!=null){   
                
        let initialDay=new Date(req.query.initialDate);
        let finalDayToDate =new Date(req.query.finalDate)
        
        if(initialDay.getTime() > finalDayToDate.getTime()){
            return reply.code(400).send({
                status:'fail',
                message:'La fecha inicial no puede ser mayor que la fecha final'
            })
        }

        let finalDay= addDays(finalDayToDate,1)
        console.log("INITIAL DATE RECEIVED CRM RENTALS: ", req.query.initialDate);
        console.log("INITIAL DATE ADJUSTED CRM RENTALS: ", initialDay);
        console.log("FINAL DATE RECEIVED CRM RENTALS: ", req.query.finalDate);                       
        console.log("FINAL DATE RECEIVED CRM RENTALS: ", finalDay);                       
        searchQuery['createdAt']={"$gte": initialDay,"$lte":finalDay}
    }
    if (req.query.initialDate!=null && req.query.finalDate==null){        
        let initialDay=new Date(req.query.initialDate);
        searchQuery['createdAt']={"$gte": initialDay}

    }
    if (req.query.finalDate!=null && req.query.initialDate==null){
        let finalDay= addDays(req.query.finalDate,1)
        searchQuery['createdAt']={"$lte": finalDay}
    }
    const options = {
        select: `-isDeleted -__v -updatedAt`, 

    }
    if (req.query.page){
        options.page = req.query.page;
    }
    if (req.query.perPage){
        options.limit = req.query.perPage;
    }
    if (req.query.column){
        let column= req.query.column
        let order = req.query.order =='desc' ? -1 :1
        options.sort={};
        options.sort[column]=order    
    }
    else{
        options.sort={"createdAt":-1}
    }
    let reservesPaginated={};
    if(!req.query.search){         
        //let sortOrder={name:1}       
        let allBranches = await Branch.find({});
        //let allModels = await Modelo.find({});
        //let allClients = await Client.find({});
        let allUsers = await User.find({});
        let allPayments = await Payment.find({})
        if(options.page!=null && options.limit!=null){
            reservesPaginated.docs=[];
            let reservesQuery = await Reserve.paginate(searchQuery, options);
            reservesQuery.docs.forEach(reserve => {
                let newObj={
                    _id:reserve._id,
                    folio:reserve.folio,
                    client:reserve.client,
                    products:reserve.products,                    
                    totalSale:reserve.totalSale,
                    createdAt:reserve.createdAt,
                    updateAt:reserve.updatedAt,                   

                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(reserve.branchId)
                })
                newObj.branchId={
                    _id:reserve.branchId ? reserve.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }
                // let modelInfo = allModels.find(modelo=>{
                //     return String(modelo._id) == String(reserve.modelId)
                // })
                // newObj.modelId={
                //     _id:reserve.modelId ? reserve.modelId :null,
                //     name : modelInfo && modelInfo.name ? modelInfo.name : "",
                //     code : modelInfo && modelInfo.code ? modelInfo.code : "",

                // }

                // let clientInfo = allClients.find(client=>{
                //     return String(client._id) == String(reserve.clientId)
                // })
                // newObj.clientId={
                //     _id:reserve.clientId ? reserve.clientId :null,
                //     fullName : clientInfo && clientInfo.fullName ? clientInfo.fullName : "",
                //     phone : clientInfo && clientInfo.phone ? clientInfo.phone : "",
                //     email : clientInfo && clientInfo.email ? clientInfo.email : "",

                // }

                let userInfo = allUsers.find(user=>{
                    return String(user._id) == String(reserve.employeeId)
                })
                newObj.employeeId={
                    _id:reserve.employeeId ? reserve.employeeId :null,
                    fullName : userInfo && userInfo.fullName ? userInfo.fullName : "",
                    phone : userInfo && userInfo.phone ? userInfo.phone : "",
                    email : userInfo && userInfo.email ? userInfo.email : "",

                }

                newObj.payments = allPayments.filter(payment=>{
                    return String ( (payment.reserveId) == String(reserve._id) && payment.isDiscarded==false)
                })

                newObj.totalPaid = _.sumBy(newObj.payments, (payment) => {
                    return Number(payment.amount.toFixed(2))
                });

                newObj.pendingBalance = newObj.totalSale - newObj.totalPaid;

                newObj.cancelledPayments = allPayments.filter(payment=>{
                    return String ( (payment.reserveId) == String(reserve._id) && payment.isDiscarded==true)
                })
                
                delete reserve.branchId;
                delete reserve.modelId;                
                delete reserve.clientId;                
                delete reserve.employeeId;                
                reservesPaginated.docs.push(newObj)                               
            });
            reservesPaginated.page=reservesQuery.page;
            reservesPaginated.perPage=reservesQuery.limit;
            reservesPaginated.totalDocs=reservesQuery.totalDocs;
            reservesPaginated.totalPages=reservesQuery.totalPages;
        }
        else{
            let sortOrder = {}
            if(req.query.column){
                
                sortOrder[req.query.column] = req.query.order == "desc" ? -1:1
            }
            else{
                sortOrder ={
                    createdAt:1
                }
            }
            reservesPaginated.docs=[]
            let reservesQuery = await Reserve.find(searchQuery).sort(sortOrder).lean();
            reservesQuery.forEach(reserve => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(reserve.branchId)
                }) 
                let branchId={
                    _id:reserve.branchId ? reserve.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",
                } 
                // let modelInfo = allModels.find(modelo=>{
                //     return String(modelo._id) == String(reserve.modelId)
                // }) 
                // let modelId={
                //     _id:reserve.modelId ? reserve.modelId :null,
                //     name : modelInfo && modelInfo.name ? modelInfo.name : "",                    
                // }
                
                // let clientInfo = allClients.find(client=>{
                //     return String(client._id) == String(reserve.clientId)
                // })

                // let clientId={
                //     _id:reserve.clientId ? reserve.clientId :null,
                //     fullName : clientInfo && clientInfo.fullName ? clientInfo.fullName : "",
                //     phone : clientInfo && clientInfo.phone ? clientInfo.phone : "",
                //     email : clientInfo && clientInfo.email ? clientInfo.email : "",

                // }

                let userInfo = allUsers.find(user=>{
                    return String(user._id) == String(reserve.employeeId)
                })
                let userId={
                    _id:reserve.employeeId ? reserve.employeeId :null,
                    fullName : userInfo && userInfo.fullName ? userInfo.fullName : "",
                    phone : userInfo && userInfo.phone ? userInfo.phone : "",
                    email : userInfo && userInfo.email ? userInfo.email : "",

                }

                let payments = allPayments.filter(payment=>{
                    return ( String(payment.reserveId) == String(reserve._id) && payment.isDiscarded==false);
                })
                
                reserve.totalPaid = _.sumBy(payments, (payment) => {
                    return Number(payment.amount.toFixed(2))
                });

                reserve.pendingBalance = reserve.totalSale - reserve.totalPaid;

                let cancelledPayments = allPayments.filter(payment=>{
                    return ( String(payment.reserveId) == String(reserve._id) && payment.isDiscarded==true);
                })

                reserve.branchId=branchId;                         
                reserve.employeeId=userId;         
                reserve.payments=payments; 
                reserve.cancelledPayments=cancelledPayments;        

                // reserve.branchName = branchInfo && branchInfo.name ? branchInfo.name : "",
                // reserve.branchCode = branchInfo && branchInfo.code ? branchInfo.code : "",
                // delete reserve.branchId;                
                reservesPaginated.docs.push(reserve)
                

                
            });
        }
        
        
        
        

        
    }
    else{
        // branchSearch = await reserve.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // reservesPaginated.totalDocs = branchSearch.length;
        let diacriticSearch = diacriticSensitiveRegex(req.query.search);
        let searchString = '.*'+diacriticSearch+'.*';

  //    let searchString = '.*'+req.query.search+'.*';
          delete options.select;
          let aggregateQuery=[];
          if(req.params.id && !req.query.branchId){
            aggregateQuery.push({
                '$match':{
                    branchId:new ObjectId(req.params.id)
                }
                })
          }
          if(!req.params.id && req.query.branchId){
            aggregateQuery.push({
                '$match':{
                    branchId:new ObjectId(req.query.branchId),
                    isStarted:true
                }
                })
          }
          if(req.query.modelId){
            aggregateQuery.push({
                '$match':{
                    modelId:new ObjectId(req.query.modelId)
                }
                })
          }

          if(req.query.clientId){
            aggregateQuery.push({
                '$match':{
                    clientId:new ObjectId(req.query.clientId)
                }
                })
          }
          if(req.query.userId){
            aggregateQuery.push({
                '$match':{
                    userId:new ObjectId(req.query.userId)
                }
                })
          }
          if(req.query.color){
            aggregateQuery.push({
                '$match':{
                    userId:new ObjectId(req.query.color)
                }
                })
          }

          if (req.query.initialDate!=null && req.query.finalDate!=null){                    
            let initialDay=new Date(req.query.initialDate);
            let finalDayToDate =new Date(req.query.finalDate)            
            if(initialDay.getTime() > finalDayToDate.getTime()){
                return reply.code(400).send({
                    status:'fail',
                    message:'La fecha inicial no puede ser mayor que la fecha final'
                })
            }
    
            let finalDay= addDays(finalDayToDate,1)
            console.log("INITIAL DATE RECEIVED CRM RENTALS: ", req.query.initialDate);
            console.log("INITIAL DATE ADJUSTED CRM RENTALS: ", initialDay);
            console.log("FINAL DATE RECEIVED CRM RENTALS: ", req.query.finalDate);                       
            console.log("FINAL DATE RECEIVED CRM RENTALS: ", finalDay);
            aggregateQuery.push({
                '$match':{
                    createdAt:{"$gte": initialDay,"$lte":finalDay}
                }
            })                                   
        }
        if (req.query.initialDate!=null && req.query.finalDate==null){        
            let initialDay=new Date(req.query.initialDate);
            aggregateQuery.push({
                '$match':{
                    createdAt:{"$gte": initialDay}
                }
            })                                              
        }
        if (req.query.finalDate!=null && req.query.initialDate==null){
            let finalDay= addDays(req.query.finalDate,1)
            aggregateQuery.push({
                '$match':{
                    createdAt:{"$lte": finalDay}
                }
            })                                                          
        }
          aggregateQuery.push(
              {
                '$match': {
                  'isDeleted': false
                }
              }, 
              {
                '$lookup': {
                  'from': 'branches', 
                  'localField': 'branchId', 
                  'foreignField': '_id', 
                  'as': 'branchInfo'
                }
              },
              
             {
                '$lookup': {
                    'from': 'users', 
                    'localField': 'employeeId', 
                    'foreignField': '_id', 
                    'as': 'employeeInfo'
                  }
             },
             {
                '$lookup': {
                    'from': 'payments', 
                    'localField': '_id', 
                    'foreignField': 'reserveId', 
                    'as': 'paymentsInfo'
                  }
             },

              
              {
                '$project': {
                  'isDeleted':1,
                  //'branchId': 1,                   
                  'folio': 1,                   
                  'branchId._id': {
                    '$first': '$branchInfo._id'
                  },
                  'branchId.code': {
                    '$first': '$branchInfo.code'
                  } ,
                  'branchId.name': {
                    '$first': '$branchInfo.name'
                  },                  
                  'client':1,                  
                  'employeeId._id': {
                    '$first': '$employeeInfo._id'
                  },
                  'employeeId.fullName': {
                    '$first': '$employeeInfo.fullName'
                  }, 
                  'employeeId.phone': {
                    '$first': '$employeeInfo.phone'
                  }, 
                  'employeeId.email': {
                    '$first': '$employeeInfo.email'
                  }, 
                  'products':1,  
                  'totalSale':1,
                  'payments': {
                    $filter: {
                        input: "$paymentsInfo",
                          as: "payment",
                          cond: { $eq: [ "$$payment.isDiscarded", false ] },
                       }
                    },
                   'cancelledPayments': {
                      $filter: {
                        input: "$paymentsInfo",
                            as: "payment",
                            cond: { $eq: [ "$$payment.isDiscarded", true ] },
                         }
                     },                              
                  'createdAt':1,
                  'updatedAt':1,                 
                }
              }, 
              
              {
                '$match': {
                  '$or': [                    
                    
                    {
                        'branchId.code': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    {
                        'branchId.name': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    {
                        'products.modelName': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    {
                        'products.color': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                      },
                    {
                        'client.fullName': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    {
                        'client.phone': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    {
                        'client.email': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    {
                        'userId.fullName': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },                    
                    {
                        'userId.email': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    }

                  ]
                }
              }
            )
            let sortQuery={
                '$sort':{}
            };
            if (req.query.column){
                let sortColumn = req.query.column;
                let order = req.query.order == "desc" ? -1: 1
                sortQuery['$sort'][sortColumn]=order;
            }
            else{
                sortQuery['$sort']['name']=1;
            }
            aggregateQuery.push(sortQuery)        
        let reservesSearch = await Reserve.aggregate(aggregateQuery);
        reservesPaginated.docs = reservesSearch;
        reservesPaginated.totalDocs = reservesPaginated.docs.length

        reservesPaginated.page=req.query.page ? req.query.page : 1;
        reservesPaginated.perPage=req.query.perPage ? req.query.perPage :reservesPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : reservesPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        reservesPaginated.docs=paginateArray(reservesSearch,limit,page);
        
        reservesPaginated.docs.forEach(doc=>{
            if (!doc.branchId || !doc.branchId._id){
                doc.branchId ={
                    _id:null,
                    code:"",
                    name:""
                }
            }
            doc.totalPaid= _.sumBy(doc.payments, (payment) => {
                return Number(payment.amount.toFixed(2))
            });
            
            doc.pendingBalance=doc.totalSale-doc.totalPaid;
        })
        reservesPaginated.totalPages = Math.ceil(reservesPaginated.totalDocs / reservesPaginated.perPage);

    }
    reservesPaginated.docs.forEach(doc=>{
        if(doc.isStarted== true && doc.expireDate){
            let currentDate = new Date ()
            let remainingTime = minutesDiff (currentDate,doc.expireDate);
            doc.remainingTime=remainingTime

        }
        

    })
    let docs = JSON.stringify(reservesPaginated.docs);    
    var reserves = JSON.parse(docs);
    

    return reply.code(200).send({
        status: 'success',
        data: reserves,
        page: reservesPaginated.page,
        perPage:reservesPaginated.perPage,
        totalDocs: reservesPaginated.totalDocs,
        totalPages: reservesPaginated.totalPages,

    })


}

function paginateArray(array, limit, page) {
    return array.slice((page - 1) * limit, page * limit);
}

function isValidObjectId(id){
    
    if(ObjectId.isValid(id)){
        if((String)(new ObjectId(id)) === id)
            return true;
        return false;
    }
    return false;
}

function diacriticSensitiveRegex(string = '') {
    return string.replace(/a/g, '[a,á,à,ä,â]')
       .replace(/e/g, '[e,é,ë,è]')
       .replace(/i/g, '[i,í,ï,ì]')
       .replace(/o/g, '[o,ó,ö,ò]')
       .replace(/u/g, '[u,ü,ú,ù]');
}

module.exports = { createPayment, showPayment, listPayments }
