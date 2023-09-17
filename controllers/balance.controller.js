const Balance = require('../models/Balance');
const Status = require('../models/Status');
const Branch = require('../models/Branch');
const Rental = require('../models/Rental');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
const Car = require('../models/Car');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const { getOffsetSetting } = require('../controllers/base.controller');
const User = require('../models/User');
const { integer } = require('sharp/lib/is');

const balanceRentalsCreate = async function (req,reply){
    let branchInfo = await Branch.findOne({_id:req.params.id, isDeleted:false})
    if(!branchInfo){
        if (!branchInfo){
            return reply.code(400).send({
                status: 'fail',
                message: 'sucursal_no_encontrada'
            })        
        } 
    }
    const decoded = await req.jwtVerify();    
    let loggedUser = await User.findOne({_id:decoded._id})  
    
    if(loggedUser == null){
        return reply.code(401).send({
            status: 'fail',
            message: 'Usuario autentificado no existe'
        })
    }
    let today = new Date ();    
    let searchQuery = {
        isDeleted: false,
        isDiscarded:false,
        branchId:ObjectId(req.params.id),
        updatedAt:{"$gte": loggedUser.lastLogin,"$lte":today},        
        paymentType:{ $regex:"efectivo",$options:'i'}
		
    };
    let rentalsQuery = await Rental.find(searchQuery)
    let userBalanceValidation= await Balance.findOne({
        isDeleted:false,
        balanceType:'rentals',
        branchId: req.params.id,
        userId: loggedUser._id,
        loginDate:loggedUser.lastLogin,

    })
    if(userBalanceValidation){
        if (rentalsQuery.length>0){
            let rentalSum = 0; 
            userBalanceValidation.quantity=rentalsQuery.length
            rentalsQuery.forEach(cashRental=>{
            rentalSum = rentalSum + cashRental.planType.price
            })        
            userBalanceValidation.amount = rentalSum;
            userBalanceValidation.balanceDate = new Date();           
        }
        await userBalanceValidation.save();
        await userBalanceValidation.populate([
            { path:'branchId',select:'name code'},
            { path:'userId',select:'fullName email phone'}
        ])    
        const balanceSavedObj = await userBalanceValidation.toObject()
        delete balanceSavedObj._v;
        return reply.code(201).send({
            status: 'success',
            data:balanceSavedObj
        })
    }

    else{        
        let balanceObj={
            balanceType:'rentals',
            branchId:req.params.id,
            userId: loggedUser._id,
            loginDate:loggedUser.lastLogin,
            amount:0,
            quantity:0            
        };
    
        if (rentalsQuery.length>0){
            balanceObj.quantity=rentalsQuery.length
            rentalsQuery.forEach(cashRental=>{
            balanceObj.amount = balanceObj.amount + cashRental.planType.price
            })         
            
        }
    
        const balance = new Balance(balanceObj);
        balance._id = new mongoose.Types.ObjectId();
        balance.balanceDate = new Date();
        let offset = await getOffsetSetting();              
        let date = new Date ();    
        if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
             date.setHours(date.getHours() - offset);
             date.setHours(offset,0,0,0);    
             // date.setHours(offset, 0, 0, 0);
        }
        else{
             date.setHours(0,0,0,0);
             date.setHours(0, 0, 0, 0);
        }
        let nextDay = addDays(date,1);
        let branchBalances = await Balance.find({
            isDeleted:false, 
            branchId:req.params.id,
            balanceDate:{"$gte": date,"$lte":nextDay},
            balanceType:'rentals'
        })
        
        let day = date.getDate();
        let month = date.getMonth() + 1
        let year = date.getFullYear();
        let dayString = day > 9 ? day : "0"+day;
        let monthString = month > 9 ? month : "0"+month;  
        let nextFolio = branchBalances.length+1
        nextFolio = nextFolio<10 ? "0000"+String(nextFolio) : nextFolio;
        nextFolio = nextFolio>=10 && nextFolio < 100? "000"+String(nextFolio) : nextFolio;
        nextFolio = nextFolio>=100 && nextFolio < 1000? "00"+String(nextFolio) : nextFolio;
        let branchCode = branchInfo.code;
        balance.folio="REN-"+branchCode+"-"+year+monthString+dayString+"-"+String(nextFolio) 


        await balance.save();
        await balance.populate([
            { path:'branchId',select:'name code'},
            { path:'userId',select:'fullName email phone'}
        ])
    
        const balanceSavedObj = await balance.toObject()
        delete balanceSavedObj._v;
        return reply.code(201).send({
            status: 'success',
            data:balanceSavedObj
        })   
    }              

}

const balancePaymentsCreate = async function (req,reply){
    let branchInfo = await Branch.findOne({_id:req.params.id, isDeleted:false})
    if(!branchInfo){
        if (!branchInfo){
            return reply.code(400).send({
                status: 'fail',
                message: 'Sucursal_no_encontrada'
            })        
        } 
    }
    const decoded = await req.jwtVerify();    
    let loggedUser = await User.findOne({_id:decoded._id})  
    
    if(loggedUser == null){
        return reply.code(401).send({
            status: 'fail',
            message: 'Usuario autentificado no existe'
        })
    }
    let today = new Date ();    
    let searchQuery = {
        isDeleted: false,
        isDiscarded:false,
        branchId:ObjectId(req.params.id),
        paidOn:{"$gte": loggedUser.lastLogin,"$lte":today},
        paymentType:{ $regex:"efectivo",$options:'i'}
    };
    let paymentsQuery = await Payment.find(searchQuery)
    let userBalanceValidation= await Balance.findOne({
        isDeleted:false,
        balanceType:'payments',
        branchId: req.params.id,
        userId: loggedUser._id,
        loginDate:loggedUser.lastLogin,

    })    
    if(userBalanceValidation){
        if (paymentsQuery.length>0){
            let rentalSum = 0; 
            userBalanceValidation.quantity=paymentsQuery.length
            paymentsQuery.forEach(cashPayment=>{
            rentalSum = rentalSum + cashPayment.amount
            })        
            userBalanceValidation.amount = rentalSum; 
            userBalanceValidation.balanceDate = new Date();          
        }
        await userBalanceValidation.save();        
        await userBalanceValidation.populate([
            { path:'branchId',select:'name code'},
            { path:'userId',select:'fullName email phone'}
        ])    
        const balanceSavedObj = await userBalanceValidation.toObject()
        delete balanceSavedObj._v;
        return reply.code(201).send({
            status: 'success',
            data:balanceSavedObj
        })
    }

    else{
        console.log("NEW")
        let balanceObj={
            balanceType:'payments',
            branchId:req.params.id,
            userId: loggedUser._id,
            loginDate:loggedUser.lastLogin,
            amount:0,
            quantity:0,
            
        };
    
        if (paymentsQuery.length>0){
            balanceObj.quantity=paymentsQuery.length
            paymentsQuery.forEach(cashPayment=>{
            balanceObj.amount = balanceObj.amount + cashPayment.amount
            })                   

        }
        
    
        const balance = new Balance(balanceObj);        
        balance._id = new mongoose.Types.ObjectId();
        balance.balanceDate = new Date()
        let offset = await getOffsetSetting();              
        let date = new Date ();    
        if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
             date.setHours(date.getHours() - offset);
             date.setHours(offset,0,0,0);    
             // date.setHours(offset, 0, 0, 0);
        }
        else{
             date.setHours(0,0,0,0);
             date.setHours(0, 0, 0, 0);
        }
        let nextDay = addDays(date,1);
        let branchBalances = await Balance.find({
            isDeleted:false, 
            branchId:req.params.id,
            balanceDate:{"$gte": date,"$lte":nextDay},
            balanceType:'payments'
        })
        
        let day = date.getDate();
        let month = date.getMonth() + 1
        let year = date.getFullYear();
        let dayString = day > 9 ? day : "0"+day;
        let monthString = month > 9 ? month : "0"+month;  
        let nextFolio = branchBalances.length+1
        nextFolio = nextFolio<10 ? "0000"+String(nextFolio) : nextFolio;
        nextFolio = nextFolio>=10 && nextFolio < 100? "000"+String(nextFolio) : nextFolio;
        nextFolio = nextFolio>=100 && nextFolio < 1000? "00"+String(nextFolio) : nextFolio;
        let branchCode = branchInfo.code;
        balance.folio="PAG-"+branchCode+"-"+year+monthString+dayString+"-"+String(nextFolio) 

        await balance.save();
        await balance.populate([
            { path:'branchId',select:'name code'},
            { path:'userId',select:'fullName email phone'}
        ])
    
        const balanceSavedObj = await balance.toObject()
        delete balanceSavedObj._v;
        return reply.code(201).send({
            status: 'success',
            data:balanceSavedObj
        })   
    }              

}

const balanceShow = async function (req,reply){
    let balance = await Balance.findOne({_id:req.params.balanceId, isDeleted:false});
    if(!balance){
        return reply.code(400).send({
            status: 'fail',
            message: 'No se encontro el corte'
        })   
    }

    await balance.populate([
        { path:'branchId',select:'name code'},
        { path:'userId',select:'fullName email phone'}
    ])

    const balanceSavedObj = await balance.toObject()
    delete balanceSavedObj._v;
    return reply.code(201).send({
        status: 'success',
        data:balanceSavedObj
    })          
    
}

const balanceList = async function (req, reply){
    let searchQuery = {
        isDeleted: false,			
    };
    if(req.params.id && !req.query.branchId){
        searchQuery['branchId']=req.params.id
    }

    if(!req.params.id && req.query.branchId){
        searchQuery['branchId']=req.query.branchId
    }
    if(req.query.userId){
        searchQuery['userId']=req.query.userId
    }

    if(req.query.balanceType != null && req.query.balanceType != ""){
        if(req.query.balanceType.toLowerCase() !='rentals' ||req.query.balanceType.toLowerCase() !='payments'){
            return reply.code(400).send({
                status:'fail',
                message:'El tipo de operación recibido no es válido'
            })

        }
        let operationType = mongoose.Types.ObjectId(req.query.operationType.toLowerCase())
        aggregateQuery.push({ "$match": {"operationType": operationType }});        
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
        searchQuery['balanceDate']={"$gte": initialDay,"$lte":finalDay}
    }
    if (req.query.initialDate!=null && req.query.finalDate==null){        
        let initialDay=new Date(req.query.initialDate);
        searchQuery['balanceDate']={"$gte": initialDay}

    }
    if (req.query.finalDate!=null && req.query.initialDate==null){
        let finalDay= addDays(req.query.finalDate,1)
        searchQuery['balanceDate']={"$lte": finalDay}
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
        options.sort={"balanceDate":-1}
    }
    let balancesPaginated={};
    if(!req.query.search){                 
        let allBranches = await Branch.find({});        
        let allUsers = await User.find({});        
        if(options.page!=null && options.limit!=null){
            balancesPaginated.docs=[];
            let balancesQuery = await Balance.paginate(searchQuery, options);
            balancesQuery.docs.forEach(balance => {
                console.log("BALANCE: ", balance)
                let newObj={
                    _id:balance._id,
                    folio:balance.folio,
                    balanceType:balance.balanceType,
                    quantity:balance.quantity,
                    amount:balance.amount,
                    loginDate:balance.loginDate,
                    balanceDate:balance.balanceDate,                   
                    createdAt:balance.createdAt,
                    updateAt:balance.updatedAt,                   

                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(balance.branchId)
                })
                newObj.branchId={
                    _id:balance.branchId ? balance.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }
                let userInfo = allUsers.find(user=>{
                    return String(user._id) == String(balance.userId)
                })
                newObj.userId={
                    _id:balance.employeeId ? balance.employeeId :null,
                    fullName : userInfo && userInfo.fullName ? userInfo.fullName : "",
                    phone : userInfo && userInfo.phone ? userInfo.phone : "",
                    email : userInfo && userInfo.email ? userInfo.email : "",

                }                                
                delete balance.branchId;                
                delete balance.userId;                
                balancesPaginated.docs.push(newObj)                               
            });
            balancesPaginated.page=balancesQuery.page;
            balancesPaginated.perPage=balancesQuery.limit;
            balancesPaginated.totalDocs=balancesQuery.totalDocs;
            balancesPaginated.totalPages=balancesQuery.totalPages;
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
            balancesPaginated.docs=[]
            let balancesQuery = await Balance.find(searchQuery).sort(sortOrder).lean();
            balancesQuery.forEach(balance => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(balance.branchId)
                }) 
                let branchId={
                    _id:balance.branchId ? balance.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",
                } 
                let userInfo = allUsers.find(user=>{
                    return String(user._id) == String(balance.userId)
                })
                let userId={
                    _id:balance.userId ? balance.userId :null,
                    fullName : userInfo && userInfo.fullName ? userInfo.fullName : "",
                    phone : userInfo && userInfo.phone ? userInfo.phone : "",
                    email : userInfo && userInfo.email ? userInfo.email : "",

                }                
                balance.branchId=branchId;                                 
                balance.userId=userId;                
                balancesPaginated.docs.push(balance)                            
            });
        }                         
    }
    else{
        // branchSearch = await balance.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // balancesPaginated.totalDocs = branchSearch.length;
        let diacriticSearch = diacriticSensitiveRegex(req.query.search);
        let searchString = '.*'+diacriticSearch+'.*';
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
          if(req.query.balanceType){
            aggregateQuery.push({
                '$match':{
                    balanceType:req.query.balanceType.toLowerCase()
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
                    balanceDate:{"$gte": initialDay,"$lte":finalDay}
                }
            })                                   
        }
        if (req.query.initialDate!=null && req.query.finalDate==null){        
            let initialDay=new Date(req.query.initialDate);
            aggregateQuery.push({
                '$match':{
                    balanceDate:{"$gte": initialDay}
                }
            })                                              
        }
        if (req.query.finalDate!=null && req.query.initialDate==null){
            let finalDay= addDays(req.query.finalDate,1)
            aggregateQuery.push({
                '$match':{
                    balanceDate:{"$lte": finalDay}
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
                    'localField': 'userId', 
                    'foreignField': '_id', 
                    'as': 'userInfo'
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
                  'userId._id': {
                    '$first': '$userInfo._id'
                  },
                  'userId.fullName': {
                    '$first': '$userInfo.fullName'
                  }, 
                  'userId.phone': {
                    '$first': '$userInfo.phone'
                  }, 
                  'userId.email': {
                    '$first': '$userInfo.email'
                  }, 
                  'quantity':1,                 
                  'amount':1,                 
                  'loginDate':1,                 
                  'balanceDate':1,                 
                  'createdAt':1,
                  'updatedAt':1,                 
                }
              }, {
                '$match': {
                  '$or': [                    
                    {
                        'folio': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                    },
                    
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
        let BalancesSearch = await Balance.aggregate(aggregateQuery);
        balancesPaginated.docs = BalancesSearch;
        balancesPaginated.totalDocs = balancesPaginated.docs.length

        balancesPaginated.page=req.query.page ? req.query.page : 1;
        balancesPaginated.perPage=req.query.perPage ? req.query.perPage :balancesPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : balancesPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        balancesPaginated.docs=paginateArray(BalancesSearch,limit,page);
        
        balancesPaginated.docs.forEach(doc=>{
            if (!doc.branchId || !doc.branchId._id){
                doc.branchId ={
                    _id:null,
                    code:"",
                    name:""
                }
            }
        })
        balancesPaginated.totalPages = Math.ceil(balancesPaginated.totalDocs / balancesPaginated.perPage);

    }
    balancesPaginated.docs.forEach(doc=>{
        if(doc.isStarted== true && doc.expireDate){
            let currentDate = new Date ()
            let remainingTime = minutesDiff (currentDate,doc.expireDate);
            doc.remainingTime=remainingTime

        }
        

    })
    let docs = JSON.stringify(balancesPaginated.docs);    
    var balances = JSON.parse(docs);
    

    return reply.code(200).send({
        status: 'success',
        data: balances,
        page: balancesPaginated.page,
        perPage:balancesPaginated.perPage,
        totalDocs: balancesPaginated.totalDocs,
        totalPages: balancesPaginated.totalPages,

    })



}

const balanceDelete = async function (req,reply){
    let balance = await Balance.findOne({_id:req.params.balanceId, isDeleted:false});
    if(!balance){
        return reply.code(400).send({
            status: 'fail',
            message: 'No se encontro el corte'
        })       
    }

    balance.isDeleted=true;    
    await balance.save();
    return reply.code(201).send({
        status: 'success',
        data:'Se eliminó el corte correctamente.'
    })
    
}

const balanceVerifications = async function (req,reply){
    const decoded = await req.jwtVerify();    
    let loggedUser = await User.findOne({_id:decoded._id});
    let now = new Date();

    let nowDateTime = now.getTime();


    let rentalsBalance = await Balance.findOne({
        isDeleted:false,
        balanceType:'rentals',
        branchId: req.params.id,
        userId: loggedUser._id,
        loginDate:loggedUser.lastLogin,
    }) 
    if(!rentalsBalance){
        return reply.code(400).send({
            status: 'fail',
            message: 'No se ha generado el corte de rentas para la ultima sesión del usuario actual.'
        })  

    }
    if (rentalsBalance){

        let datesDifference = nowDateTime - rentalsBalance.balanceDate.getTime();
        console.log("now:  ",now)
        console.log("DATES DIFF:",datesDifference)
        if (datesDifference>90000){
            return reply.code(400).send({
                status: 'fail',
                message: 'El corte de rentas ha expirado, es necesario calcularlo de nuevo.'
            })  
        }
    }

    let paymentsBalance = await Balance.findOne({
        isDeleted:false,
        balanceType:'payments',
        branchId: req.params.id,
        userId: loggedUser._id,
        loginDate:loggedUser.lastLogin,
    }) 

    if (!paymentsBalance){
        return reply.code(400).send({
            status: 'fail',
            message: 'No se ha generado el corte de pagos para la ultima sesión del usuario actual.'
        })  
    }



    if (paymentsBalance){
        let datesDifference = nowDateTime - paymentsBalance.balanceDate.getTime();
        if (datesDifference>90000){
            return reply.code(400).send({
                status: 'fail',
                message: 'El corte de pagos ha expirado, es necesario calcularlo de nuevo.'
            })  
        }
    }

    return reply.code(201).send({
        status: 'success',
        data:'Cortes con fecha valida'
    })


}

const balanceUpdate = async function (req,reply){
    
}

function addMinutes(date, minutes) {    
    date.setMinutes(date.getMinutes() + minutes);  
 
    return date;
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

function minutesDiff(dateTimeValue2, dateTimeValue1) {
    let negativeResult = false
    if(dateTimeValue2>dateTimeValue1){    
        negativeResult=true;
    }    
    var differenceValue =(dateTimeValue1.getTime() - dateTimeValue2.getTime()) / 1000;
    differenceValue /= 60;
    let result = Math.abs(Math.round(differenceValue)); 
    result = negativeResult==true? -result : result;
    return result
 }
 

function diacriticSensitiveRegex(string = '') {
    return string.replace(/a/g, '[a,á,à,ä,â]')
       .replace(/e/g, '[e,é,ë,è]')
       .replace(/i/g, '[i,í,ï,ì]')
       .replace(/o/g, '[o,ó,ö,ò]')
       .replace(/u/g, '[u,ü,ú,ù]');
}

module.exports = { balanceRentalsCreate, balanceDelete, balanceList, balanceShow, balanceUpdate, balancePaymentsCreate, balanceVerifications }