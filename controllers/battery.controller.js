const Car = require('../models/Car');
const Battery = require('../models/Battery');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const batteryCreate = async function (req,reply){
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
            var activeCar = await Car.findOne({_id:car.carId, isDeleted:false})
            if (!activeCar){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'El id '+car.carId+' no existe'
                })
            }          
          
        }
        let batteryValidation = await Battery.findOne({carId:car.carId, isDeleted:false, branchId:req.params.id})
        if (batteryValidation){
            batteryValidation.records.unshift({
                value:car.value,
                dateTime:new Date(car.dateTime)
            })
            await batteryValidation.save()
        }
        else{
            let newBattery={
                isDeleted:false,
                carId:car.carId,
                branchId:req.params.id,
                modelId:activeCar.modelId,
                records:[
                    {
                        value:car.value,
                        dateTime:car.dateTime
                    }
                ]
            }
            const battery = new Battery(newBattery)
            battery._id = mongoose.Types.ObjectId()
            await battery.save();
        }       
    }
    return  reply.code(201).send({
        status: 'success',
        message: 'Baterias actualizadas'
     })  
}

const batteryList = async function (req,reply){
    let searchQuery = {
        isDeleted: false,			
    };    
    if (req.query.branchId){
        searchQuery['branchId']=ObjectId(req.query.branchId)
    }    
    
    if (req.query.modelId){
        searchQuery['modelId']=ObjectId(req.query.modelId)
    } 
    if (req.query.modelIdId){
        searchQuery['carId']=ObjectId(req.query.carId)
    }    
    if(req.params.id){
        
        searchQuery['branchId']=ObjectId(req.params.id)
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
    let batteriesPaginated={};
    if(!req.query.search){     
        let allBranches = await Branch.find({});
        let allCars = await Car.find({});
        let allModels = await Modelo.find({});
        if(options.page!=null && options.limit!=null){
            batteriesPaginated.docs=[]
            let batteryQuery = await Battery.paginate(searchQuery, options);             
            batteryQuery.docs.forEach(battery => {
                let newObj={
                    _id:battery._id,
                    records:req.params.id? [battery.records[0]]:battery.records,                    
                    createdAt:battery.createdAt,
                    updatedAt:battery.updatedAt
                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(battery.branchId)
                })
                newObj.branchId={
                    _id : battery.branchId ? battery.branchId:"",
                    name: branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                } 
                delete battery.branchId;
                let carInfo = allCars.find(branch=>{
                    return String(branch._id) == String(battery.carId)
                })
                newObj.carId={
                    _id: battery.carId ? battery.carId :"",
                    name : carInfo && carInfo.name ? carInfo.name : "",  
                    color: carInfo && carInfo.color ? carInfo.color : "",                                     
                }
                let modelInfo =allModels.find(modelo=>{
                    return String(modelo._id) == String(battery.modelId)
                })

                newObj.modelId={
                    _id: battery.modelId ? battery.modelId :"",
                    name : modelInfo && modelInfo.name ? modelInfo.name : "",  
                    
                }
                delete battery.carId;               
                batteriesPaginated.docs.push(newObj)                
            });
            
            if(req.query.color){
                let filteredDocs = batteriesPaginated.docs.filter(doc=>{
                    return String(doc.carId.color).toLowerCase() == String(req.query.color).toLowerCase()
                })
                batteriesPaginated.docs=filteredDocs            
                
            }
            if(req.query.name){
                let filteredDocs = batteriesPaginated.docs.filter(doc=>{
                    return String(doc.carId.name).toLowerCase() == String(req.query.name).toLowerCase()
                })
                batteriesPaginated.docs=filteredDocs
                
            }
            batteriesPaginated.page=batteryQuery.page;
            batteriesPaginated.perPage=batteryQuery.limit;
            batteriesPaginated.totalDocs=batteryQuery.totalDocs;
            batteriesPaginated.totalPages=batteryQuery.totalPages;
            
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
            batteriesPaginated.docs=[]
            let batteryQuery = await Battery.find(searchQuery).sort(sortOrder).lean();
            batteryQuery.forEach(battery => {
                battery.records=req.params.id? [battery.records[0]]:battery.records;

                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(battery.branchId)
                })
                let carInfo = allCars.find(branch=>{
                    return String(branch._id) == String(battery.carId)
                })
                let modelInfo =allModels.find(modelo=>{
                    return String(modelo._id) == String(battery.modelId)
                })
                let carId = battery.carId;
                let branchId = battery.branchId;
                let modelId = battery.modelId;
                battery.carId={
                    _id:carId? carId:"",
                    name:carInfo && carInfo.name ? carInfo.name : "",
                    color: carInfo && carInfo.color ? carInfo.color : "",  
                }

                battery.modelId={
                    _id:modelId? modelId:"",
                    name:modelInfo && modelInfo.name ? modelInfo.name : "",                                        
                }
                
                //batteriesPaginated.docs.push(battery)            
                battery.branchId={
                    _id:branchId ? branchId :"",
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }                
                //delete battery.branchId;                
                batteriesPaginated.docs.push(battery)                                
            });
            if(req.query.modelId){
                let filteredDocs = batteriesPaginated.docs.filter(doc=>{
                    return String(doc.carId.modelo) == String(req.query.modelId)
                })
                batteriesPaginated.docs=filteredDocs

            }
            if(req.query.color){
                let filteredDocs = batteriesPaginated.docs.filter(doc=>{
                    return String(doc.carId.color).toLowerCase() == String(req.query.color).toLowerCase()
                })
                batteriesPaginated.docs=filteredDocs            
                
            }
            if(req.query.name){
                let filteredDocs = batteriesPaginated.docs.filter(doc=>{
                    return String(doc.carId.name).toLowerCase() == String(req.query.name).toLowerCase()
                })
                batteriesPaginated.docs=filteredDocs
                
            }
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

        if(req.query.branchId){
            aggregateQuery.push({
                '$match': {
                  'branchId': ObjectId(req.query.branchId)
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

        if(req.query.modelId){
            aggregateQuery.push({
                '$match': {
                  'modelId': ObjectId(req.query.modelId)
                }
            })            
        } 
        
        
        let projectQuery={
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
              'modelId._id': {
                '$first': '$carInfo.modelId._id'
              },
              'modelId.name': {
                '$first': '$carInfo.modelId.name'
              },
              'createdAt'  :1

          }
        }

        //if (req.query.params.id){
            projectQuery['$project']['records']={
                '$first': 'records'
              }
        //}
        
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
                '$lookup': {
                  'from': 'modelos', 
                  'localField': 'modelId', 
                  'foreignField': '_id', 
                  'as': 'modelInfo'
                }
            },
            projectQuery,
            
        )
        // if(req.query.modelId){
        //     aggregateQuery.push({
        //         '$match':{
        //             'carId.modelo':req.query.modelId
        //         }
        //     })
        // }
        if(req.query.color){
            aggregateQuery.push({
                '$match':{
                    'carId.color':req.query.color
                }
            })
        }
        let matchSearch={
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
                    'modelId.name': {
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
                  {
                      'carId.color': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                  },
                  {
                      'carId.color': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                  },
                    
                ]
              }
        }
        aggregateQuery.push(matchSearch)

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
        

        let batterySearch = await Battery.aggregate(aggregateQuery);
        batteriesPaginated.docs = batterySearch;
        batteriesPaginated.totalDocs = batteriesPaginated.docs.length

        batteriesPaginated.page=req.query.page ? req.query.page : 1;
        batteriesPaginated.perPage=req.query.perPage ? req.query.perPage :batteriesPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : batteriesPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        batteriesPaginated.docs=paginateArray(batterySearch,limit,page);
        batteriesPaginated.totalPages = Math.ceil(batteriesPaginated.totalDocs / batteriesPaginated.perPage);

    }
    if (req.query.initialDate!=null && req.query.finalDate!=null){
        batteriesPaginated.docs.forEach(doc=>{
            doc.records.forEach(record=>{
                doc.dateTime = doc.dateTime.getTime()
            })
        })
    }

    if (req.query.initialDate!=null && req.query.finalDate!=null){      
        
        
        let initialDay=new Date(req.query.initialDate);
        let finalDayToDate =new Date(req.query.finalDate)
        let initialTime = initialDay.getTime();
        
        
        if(initialDay.getTime() > finalDayToDate.getTime()){
            return reply.code(400).send({
                status:'fail',
                message:'La fecha inicial no puede ser mayor que la fecha final'
            })
        }

        let finalDay= addDays(finalDayToDate,1)
        let finalTime = finalDay.getTime()
        batteriesPaginated.docs.forEach(doc=>{
            let filteredRecords = doc.records.filter(record=>{
                return record.dateTime>=initialTime && record.dateTime<=finalTime
            })            
            doc.records = filteredRecords
            doc.totalRecords = doc.records.length;

        })

        //searchQuery['createdAt']={"$gte": initialDay,"$lte":finalDay}
    }
    if (req.query.initialDate!=null && req.query.finalDate==null){        
        let initialDay=new Date(req.query.initialDate);
        let initialTime = initialDay.getTime();
        batteriesPaginated.docs.forEach(doc=>{
            let filteredRecords = doc.records.filter(record=>{
                return record.dateTime>=initialTime
            })            
            doc.records = filteredRecords
            doc.totalRecords = doc.records.length;

        })
        //searchQuery['createdAt']={"$gte": initialDay}

    }
    if (req.query.finalDate!=null && req.query.initialDate==null){
        let finalDay= addDays(req.query.finalDate,1)
        let finalTime = finalDay.getTime()
        
        batteriesPaginated.docs.forEach(doc=>{
            let filteredRecords = doc.records.filter(record=>{
                return record.dateTime<=finalTime
            })            
            doc.records = filteredRecords
            doc.totalRecords = doc.records.length;
        })
        
        
    } 

    return reply.code(200).send({
        status: 'success',
        data: batteriesPaginated.docs,
        page: batteriesPaginated.page,
        perPage:batteriesPaginated.perPage,
        totalDocs: batteriesPaginated.totalDocs,
        totalPages: batteriesPaginated.totalPages,

    })

}

const batteryDelete = async function (req,reply){

}

const batteryUpdate = async function (req,reply){

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


module.exports = { batteryCreate, batteryDelete, batteryList, batteryUpdate }