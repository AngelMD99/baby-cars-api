const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const Reserve = require('../models/Reserve');
const Branch = require('../models/Branch');
const User = require('../models/User');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
var _ = require('lodash');


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
    if(req.query.collectedBy){
        searchQuery['collectedBy']=req.query.collectedBy
    }

    if(req.query.operationType && req.query.operationType!=""){
        if(!['reserve','single'].includes(req.query.operationType.toLowerCase())) {
            return reply.code(400).send({
                status:'fail',
                message:'Tipo de operación no valido'
            })
        }
        searchQuery['operationType']=req.query.operationType
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
    let paymentsPaginated={};
    if(!req.query.search){  
        let modelFilter=false;
        let colorFilter=false;
        if(req.query.modelId && req.query.modelId!=""){
            modelFilter=true;
        }
        if(req.query.color && req.query.color!=""){
            colorFilter=true;
        }
        //let sortOrder={name:1}       
        let allBranches = await Branch.find({});
        let allSales = await Sale.find({});
        let allReserves = await Reserve.find({});
        //let allModels = await Modelo.find({});
        //let allClients = await Client.find({});
        let allUsers = await User.find({});        
        if(options.page!=null && options.limit!=null){
            paymentsPaginated.docs=[];
            let paymentsQuery = await Payment.paginate(searchQuery, options);
            paymentsQuery.docs.forEach(payment => {
                let newObj={
                    _id:payment._id,
                    folio:payment.folio,
                    operationType:payment.operationType,
                    client:payment.client,
                    products:payment.products,                    
                    totalSale:payment.totalSale,
                    createdAt:payment.createdAt,
                    updateAt:payment.updatedAt,                   

                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(payment.branchId)
                })
                newObj.branchId={
                    _id:payment.branchId ? payment.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }
                if(payment.saleId){
                    let saleInfo = allSales.find(sale=>{
                        return String(sale._id) == String(payment.saleId)
                    })
                    if(saleInfo){
                        newObj.saleId=saleInfo;
                    }

                }
                if(payment.reserveId){
                    let reserveInfo = allReserves.find(reserve=>{
                        return String(reserve._id) == String(payment.reserveId)
                    })
                    if(reserveInfo){
                        newObj.reserveId=reserveInfo;
                    }
                    
                }                

                let userInfo = allUsers.find(user=>{
                    return String(user._id) == String(payment.collectedBy)
                })
                newObj.collectedBy={
                    _id:payment.collectedBy ? payment.collectedBy :null,
                    fullName : userInfo && userInfo.fullName ? userInfo.fullName : "",
                    phone : userInfo && userInfo.phone ? userInfo.phone : "",
                    email : userInfo && userInfo.email ? userInfo.email : "",

                }                
                
                delete payment.branchId;                                
                delete payment.employeeId;  
                if(modelFilter == false && colorFilter == false){
                    paymentsPaginated.docs.push(newObj) 
                }
                else{                    
                    if(modelFilter == true && colorFilter == true){ 
                        
                        if(newObj.saleId){
                            if(newObj.saleId.products){
                                let bothFilters = newObj.saleId.products.find( item =>{
                                    return String(item.modelId) == String(req.query.modelId) && item.color.toLowerCase() == req.query.color.toLowerCase()
                                })                            
                                if (bothFilters){
                                    paymentsPaginated.docs.push(newObj) 
                                }                              
                           
                            }

                        }
                        if(newObj.reserveId){
                            if(newObj.reserveId.products){
                                let bothFilters = newObj.reserveId.products.find( item =>{
                                    return String(item.modelId) == String(req.query.modelId) && item.color.toLowerCase() == req.query.color.toLowerCase()
                                })                            
                                if (bothFilters){
                                    paymentsPaginated.docs.push(newObj) 
                                }                                                         
                            }                            
                        }
                    }

                    else{
                        
                        if(modelFilter == true && colorFilter == false){                            
                            if(newObj.saleId){
                                if(newObj.saleId.products  ){
                                    let modelFilter = newObj.saleId.products.find(item=>{
                                        return String(item.modelId) == String(req.query.modelId)
                                    })                                    
                                    if(modelFilter){
                                        paymentsPaginated.docs.push(newObj) 
                                    }                                    
                                }   
                                
    
                            }
                            if(newObj.reserveId){
                                let modelFilter = newObj.reserveId.products.find(item=>{
                                    return String(item.modelId) == String(req.query.modelId)
                                })                                    
                                if(modelFilter){
                                    paymentsPaginated.docs.push(newObj) 
                                }                                   
                            }
                        }
                        else{
                            if(newObj.saleId){                             
                                if(newObj.saleId.products  ){
                                    let colorFilter = newObj.saleId.products.find(item=>{
                                        return item.color.toLowerCase() == req.query.color.toLowerCase()
                                    })                                    
                                    if(colorFilter){
                                        paymentsPaginated.docs.push(newObj) 
                                    }                                    
                                }    
                            }
                            if(newObj.reserveId){
                                if(newObj.reserveId.products  ){
                                    let colorFilter = newObj.reserveId.products.find(item=>{
                                        return item.color.toLowerCase() == req.query.color.toLowerCase()
                                    })
                                    if(colorFilter){
                                        paymentsPaginated.docs.push(newObj) 
                                    }                                    
                                }    
                            }


                        }
                    
                    }
                }
                
            });
            paymentsPaginated.page=paymentsQuery.page;
            paymentsPaginated.perPage=paymentsQuery.limit;
            paymentsPaginated.totalDocs=paymentsQuery.length;
            paymentsPaginated.totalPages=paymentsQuery.totalPages;
        }
        else{
            let sortOrder = {}
            if(req.query.column){
                
                sortOrder[req.query.column] = req.query.order == "desc" ? -1:1
            }
            else{
                sortOrder ={
                    createdAt:-1
                }
            }
            paymentsPaginated.docs=[]
            let paymentsQuery = await Payment.find(searchQuery).sort(sortOrder).lean();
            paymentsQuery.forEach(payment => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(payment.branchId)
                }) 
                let branchId={
                    _id:payment.branchId ? payment.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",
                } 
  
                let userInfo = allUsers.find(user=>{
                    return String(user._id) == String(payment.collectedBy)
                })
                let userId={
                    _id:payment.collectedBy ? payment.collectedBy :null,
                    fullName : userInfo && userInfo.fullName ? userInfo.fullName : "",
                    phone : userInfo && userInfo.phone ? userInfo.phone : "",
                    email : userInfo && userInfo.email ? userInfo.email : "",

                }

                payment.branchId=branchId;                         
                payment.collectedBy=userId;  
                if(payment.saleId){
                    let saleInfo = allSales.find(sale=>{
                        return String(sale._id) == String(payment.saleId)
                    })
                    if(saleInfo){
                        payment.saleId=saleInfo;
                    }

                }
                if(payment.reserveId){
                    let reserveInfo = allReserves.find(reserve=>{
                        return String(reserve._id) == String(payment.reserveId)
                    })
                    if(reserveInfo){
                        payment.reserveId=reserveInfo;
                    }
                    
                }                      

                if(modelFilter == false && colorFilter == false){
                    paymentsPaginated.docs.push(payment) 
                }
                else{                    
                    if(modelFilter == true && colorFilter == true){ 
                        
                        if(payment.saleId){
                            if(payment.saleId.products){
                                let bothFilters = payment.saleId.products.find( item =>{
                                    return String(item.modelId) == String(req.query.modelId) && item.color.toLowerCase() == req.query.color.toLowerCase()
                                })                            
                                if (bothFilters){
                                    paymentsPaginated.docs.push(payment) 
                                }                              
                           
                            }

                        }
                        if(payment.reserveId){
                            if(payment.reserveId.products){
                                let bothFilters = payment.reserveId.products.find( item =>{
                                    return String(item.modelId) == String(req.query.modelId) && item.color.toLowerCase() == req.query.color.toLowerCase()
                                })                            
                                if (bothFilters){
                                    paymentsPaginated.docs.push(payment) 
                                }                                                         
                            }                            
                        }
                    }

                    else{
                        
                        if(modelFilter == true && colorFilter == false){                            
                            if(payment.saleId){
                                if(payment.saleId.products  ){
                                    let modelFilter = payment.saleId.products.find(item=>{
                                        return String(item.modelId) == String(req.query.modelId)
                                    })                                    
                                    if(modelFilter){
                                        paymentsPaginated.docs.push(payment) 
                                    }                                    
                                }   
                                
    
                            }
                            if(payment.reserveId){
                                let modelFilter = payment.reserveId.products.find(item=>{
                                    return String(item.modelId) == String(req.query.modelId)
                                })                                    
                                if(modelFilter){
                                    paymentsPaginated.docs.push(payment) 
                                }                                   
                            }
                        }
                        else{
                            if(payment.saleId){                             
                                if(payment.saleId.products  ){
                                    let colorFilter = payment.saleId.products.find(item=>{
                                        return item.color.toLowerCase() == req.query.color.toLowerCase()
                                    })                                    
                                    if(colorFilter){
                                        paymentsPaginated.docs.push(payment) 
                                    }                                    
                                }    
                            }
                            if(newObj.reserveId){
                                if(newObj.reserveId.products  ){
                                    let colorFilter = newObj.reserveId.products.find(item=>{
                                        return item.color.toLowerCase() == req.query.color.toLowerCase()
                                    })
                                    if(colorFilter){
                                        paymentsPaginated.docs.push(newObj) 
                                    }                                    
                                }    
                            }


                        }
                    
                    }
                }
                //paymentsPaginated.docs.push(payment)               
                
            });
            paymentsPaginated.totalDocs=paymentsPaginated.length;

        }
        
        
        
        

        
    }
    else{
        // branchSearch = await Payment.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // paymentsPaginated.totalDocs = branchSearch.length;
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
                    branchId:new ObjectId(req.query.branchId)
                }
            })
          }

          if(req.query.collectedBy){
            aggregateQuery.push({
                '$match':{
                    collectedBy:new ObjectId(req.query.userId)
                }
                })
          }

          if(req.query.operationType){
            aggregateQuery.push({
                '$match':{
                    operationType:req.query.operationType
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
                    'localField': 'collectedBy', 
                    'foreignField': '_id', 
                    'as': 'employeeInfo'
                  }
             },
             {
                '$lookup': {
                    'from': 'sales', 
                    'localField': 'saleId', 
                    'foreignField': '_id', 
                    'as': 'saleInfo'
                  }
             },
             {
                '$lookup': {
                    'from': 'reserves', 
                    'localField': 'reserveId', 
                    'foreignField': '_id', 
                    'as': 'reserveInfo'
                  }
             },

              
              {
                '$project': {
                  'isDeleted':1,
                  //'branchId': 1,                   
                  'folio': 1, 
                  'operationType':1,
                  'branchId._id': {
                    '$first': '$branchInfo._id'
                  },
                  'branchId.code': {
                    '$first': '$branchInfo.code'
                  } ,
                  'branchId.name': {
                    '$first': '$branchInfo.name'
                  },                                    
                  'collectedBy._id': {
                    '$first': '$employeeInfo._id'
                  },
                  'collectedBy.fullName': {
                    '$first': '$employeeInfo.fullName'
                  }, 
                  'collectedBy.phone': {
                    '$first': '$employeeInfo.phone'
                  }, 
                  'collectedBy.email': {
                    '$first': '$employeeInfo.email'
                  }, 
                  'saleId':{
                    '$first':'$saleInfo'

                  },
                  'reserveId':{
                    '$first':'$reserveInfo'

                  },
                  
                  'createdAt':1,
                  'updatedAt':1,                 
                }
              }, 
              

            )

            if(req.query.modelId){
                aggregateQuery.push({
                    '$match':{
                        '$or':[
                            {
                                'saleId.products.modelId':new ObjectId(req.query.modelId)
                            },
                            {
                                'reserveId.products.modelId':new ObjectId(req.query.modelId)

                            }
                        ]
                    }
                })
            }

            if(req.query.color){
                aggregateQuery.push({
                    '$match':{
                        '$or':[
                            {
                                'saleId.products.color':req.query.color.toLowerCase()
                            },
                            {
                                'reserveId.products.color':req.query.color.toLowerCase()

                            }
                        ]
                    }
                })
            }


            aggregateQuery.push(
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
                            'saleId.folio': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },

                        {
                            'saleId.products.modelName': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },
                        {
                            'saleId.products.color': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },
                        {
                            'saleId.client.fullName': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },
                        {
                            'saleId.client.phone': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },
                        {
                            'saleId.client.email': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },

                        {
                            'reserveId.folio': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },

                        {
                            'reserveId.products.modelName': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },
                        {
                            'reserveId.products.color': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },
                          {
                            'reserveId.client.fullName': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },
                        {
                            'reserveId.client.phone': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },
                        {
                            'reseverId.client.email': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                          },                        
                        {
                            'collectedBy.fullName': {
                              '$regex': searchString, 
                              '$options': 'i'
                            }
                        },                    
                        {
                            'collectedBy.email': {
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
        let paymentsSearch = await Payment.aggregate(aggregateQuery);
        paymentsPaginated.docs = paymentsSearch;
        paymentsPaginated.totalDocs = paymentsPaginated.docs.length

        paymentsPaginated.page=req.query.page ? req.query.page : 1;
        paymentsPaginated.perPage=req.query.perPage ? req.query.perPage :paymentsPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : paymentsPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        paymentsPaginated.docs=paginateArray(paymentsSearch,limit,page);
        
        paymentsPaginated.docs.forEach(doc=>{
            if (!doc.branchId || !doc.branchId._id){
                doc.branchId ={
                    _id:null,
                    code:"",
                    name:""
                }
            }
            // doc.totalPaid= _.sumBy(doc.payments, (payment) => {
            //     return Number(payment.amount.toFixed(2))
            // });
            
            // doc.pendingBalance=doc.totalSale-doc.totalPaid;
        })
        paymentsPaginated.totalPages = Math.ceil(paymentsPaginated.totalDocs / paymentsPaginated.perPage);

    }
    
    let docs = JSON.stringify(paymentsPaginated.docs);    
    var payments = JSON.parse(docs);
    

    return reply.code(200).send({
        status: 'success',
        data: payments,
        page: paymentsPaginated.page,
        perPage:paymentsPaginated.perPage,
        totalDocs: paymentsPaginated.totalDocs,
        totalPages: paymentsPaginated.totalPages,

    })


}

function addDays(date, days) {
    var newDate = new Date(date.valueOf());
    newDate.setDate(newDate.getDate() + days);
    return newDate;
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
