const Status = require('../models/Status');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
const Car = require('../models/Car');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const statusCreate = async function (req,reply){
    let carsArray = req.body.carsArray;
    for ( const car of carsArray){        
        let carValidation = isValidObjectId(car.carId)
        if (carValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'El id '+car.carId+' no es un id valido en la base de datos'
            })
        }
        else{
            let activeCar = await Car.findOne({_id:car.carId, isDeleted:false})
            if (!activeCar){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'El id '+car.carId+' no existe'
                })
            }          
          
        }
        let statusValidation = await Status.findOne({carId:car.carId, isDeleted:false, branchId:req.params.id})
        if (statusValidation){
            statusValidation.records.push({
                value:car.value,
                dateTime:car.dateTime
            })
            await statusValidation.save()
        }
        else{
            let newStatus={
                isDeleted:false,
                carId:car.carId,
                branchId:req.params.id,
                records:[
                    {
                        value:car.value,
                        dateTime:car.dateTime
                    }
                ]
            }
            const status = new Status(newStatus)
            status._id = mongoose.Types.ObjectId()
            await status.save();
        }        
    }
    return  reply.code(201).send({
        status: 'success',
        message: 'Estados actualizados'
     })     
}

const statusList = async function (req,reply){
    let searchQuery = {
        isDeleted: false,			
    };

    if (req.query.branchId){
        searchQuery['branchId']=ObjectId(req.query.branchId)
    }

    const options = {
        select: `-isDeleted -__v`, 
    }

    if (req.query.page){
        options.page = req.query.page;
    }
    if (req.query.page){
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
    let statusPaginated={};
    if(!req.query.search){        
        let allBranches = await Branch.find({});
        let allCars = await Car.find({});
        if(options.page!=null && options.limit!=null){
            statusPaginated.docs=[]
            let statusQuery = await Status.paginate(searchQuery, options);             
            statusQuery.docs.forEach(status => {
                let newObj={
                    _id:status._id,
                    record:status.record,                    
                    createdAt:status.createdAt,
                    updatedAt:status.updatedAt
                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(status.branchId)
                })
                newObj.branchId={
                    _id : status.branchId ? status.branchId:"",
                    name: branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                } 
                delete status.branchId;
                let carInfo = allCars.find(branch=>{
                    return String(branch._id) == String(status.carId)
                })
                newObj.carId={
                    _id: status.carId ? status.carId :"",
                    name : carInfo && carInfo.name ? carInfo.name : "",  
                    color: carInfo && carInfo.color ? carInfo.color : "",  
                    modelo: carInfo && carInfo.modelId ? carInfo.modelId : "",               
                }
                delete status.carId;
               
                statusPaginated.docs.push(newObj)                
            });
            statusPaginated.page=statusQuery.page;
            statusPaginated.perPage=statusQuery.limit;
            statusPaginated.totalDocs=statusQuery.totalDocs;
            statusPaginated.totalPages=statusQuery.totalPages;
            
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
            statusPaginated.docs=[]
            let statusQuery = await Status.find(searchQuery).sort(sortOrder).lean();
            statusQuery.forEach(status => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(status.branchId)
                })
                let carInfo = allCars.find(branch=>{
                    return String(branch._id) == String(status.carId)
                })
                let carId = status.carId;
                let branchId = status.branchId;
                status.carId={
                    _id:carId? carId:"",
                    name:carInfo && carInfo.name ? carInfo.name : "",
                    color: carInfo && carInfo.color ? carInfo.color : "",  
                    modelo: carInfo && carInfo.modelId ? carInfo.modelId : "",               
                }
                
                //statusPaginated.docs.push(status)            
                status.branchId={
                    _id:branchId ? branchId :"",
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }                
                //delete status.branchId;                
                statusPaginated.docs.push(status)                                
            });
        }                         
    }
    else{        
        let diacriticSearch = diacriticSensitiveRegex(req.query.search);
        let searchString = '.*'+diacriticSearch+'.*';
  //    let searchString = '.*'+req.query.search+'.*';
        delete options.select;
        let dateMatchStage={};
        let aggregateQuery=[{
            '$match': {
              'isDeleted': false
            }
        }];        

        if(req.params.id){
            aggregateQuery.push({
                '$match': {
                  'branchId': ObjectId(req.params.id)
                }
            })
        }

        if(req.query.carId){
            aggregateQuery.push({
                '$match': {
                  'branchId': ObjectId(req.query.carId)
                }
            })            
        }        
        
        aggregateQuery.push(
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
                  'from': 'cars', 
                  'localField': 'carId', 
                  'foreignField': '_id', 
                  'as': 'carInfo'
            }
            },
            {
                '$project': {
                  "isDeleted":1,
                  "records":1,                  
                  'branchId._id': {
                    '$first': '$branchInfo._id'
                  },
                  'branchId.name': {
                    '$first': '$branchInfo.name'
                  },
                  'branchId.code': {
                    '$first': '$branchInfo.code'
                  },
                  'carId._id': {
                    '$first': '$carInfo._id'
                  },
                  'carId.name': {
                    '$first': '$carInfo.name'
                  },
                  'carId.color': {
                    '$first': '$carInfo.color'
                  },
                  'carId.modelo': {
                    '$first': '$carInfo.modelId'
                  },
                  'createdAt'  :1

              }
            }, {
              '$match': {
                 '$or': [
                    {
                      'branchId.code': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    }, {
                      'branchId.name': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    },
                    {
                        'carId.name': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                      },
                      
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
            sortQuery['$sort']['createdAt']=-1;
        }      
        
        aggregateQuery.push(sortQuery)
        

        let statusSearch = await Status.aggregate(aggregateQuery);
        statusPaginated.docs = statusSearch;
        statusPaginated.totalDocs = statusPaginated.docs.length

        statusPaginated.page=req.query.page ? req.query.page : 1;
        statusPaginated.perPage=req.query.perPage ? req.query.perPage :statusPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : statusPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        statusPaginated.docs=paginateArray(statusSearch,limit,page);
        statusPaginated.totalPages = Math.ceil(statusPaginated.totalDocs / statusPaginated.perPage);

    }

    reply.code(200).send({
        status: 'success',
        data: statusPaginated.docs,
        page: statusPaginated.page,
        perPage:statusPaginated.perPage,
        totalDocs: statusPaginated.totalDocs,
        totalPages: statusPaginated.totalPages,

    })

    

}

const statusDelete = async function (req,reply){

}

const statusUpdate = async function (req,reply){

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


module.exports = { statusCreate, statusDelete, statusList, statusUpdate }