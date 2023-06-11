const Rental = require('../models/Rental');
const Branch = require('../models/Branch');
const Car = require('../models/Car');
const Modelo = require('../models/Modelo');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const { getOffsetSetting } = require('../controllers/base.controller');
const { findOneAndDelete } = require('../models/Branch');

const rentalCreate = async function (req, reply){
    if(!req.body.branchId){
        return reply.code(400).send({
            status: 'fail',
            message: 'La sucursal es requerida'
        })
    }

    if(!req.body.carId){
        return reply.code(400).send({
            status: 'fail',
            message: 'El carrito es requerido'
        })
    }

    if(!req.body.paymentType){
        return reply.code(400).send({
            status: 'fail',
            message: 'El tipo de pago es requerido'
        })
    }

    
    let branchValidation= isValidObjectId(req.body.branchId)
        if (branchValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Sucursal no válida'
            })
    }
    
    let activeBranch= await Branch.findOne({_id:req.body.branchId,isDeleted:false})
        if(!activeBranch){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Sucursal no encontrada'
                })

        }
       
    
    //if(req.body.carId!=null){        
        let carValidation= isValidObjectId(req.body.carId)
        if (carValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Carrito no válido'
            })
        }
        //else{
            let activeCar= await Car.findOne({_id:req.body.carId,isDeleted:false})
            if(!activeCar){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Carrito no encontrado'
                })
            }
            if(activeCar.isStarted){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Carrito con etiqueta '+activeCar.name+' esta encendido'
                })

            }
        //}
    //}
    let branchId = mongoose.Types.ObjectId(req.body.branchId);
    let carId= mongoose.Types.ObjectId(req.body.carId);    
    delete req.body.branchId;
    delete req.bodycarId;
    const rental = new Rental(req.body);    
    rental._id = mongoose.Types.ObjectId();
    rental.carId = carId;
    rental.branchId = branchId;
    //let branchId = mongoose.Types.ObjectId(req.body.branchId)
    let branchRentals = await Rental.find({branchId:branchId})
    // let offset = req.headers.offset ? req.headers.offset : 6
    let offset = await getOffsetSetting();              
    let date = new Date ();
    console.log("NEW DATE UTC : ",date)
    date.setHours(date.getHours() - offset);    
    // if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
    //     date.setHours(date.getHours() - offset);
    //     console.log("DATE GMT ADJUSTED: ",date)
    //     // date.setHours(offset,0,0,0);    
    //     // date.setHours(offset, 0, 0, 0);
    // }
    // else{
    //     date.setHours(0,0,0,0);
    //     date.setHours(0, 0, 0, 0);
    // }
    console.log("CURRENT DATE AND TIME ZONE: ",date);
    let day = date.getDate();
    let month = date.getMonth() + 1
    let year = date.getFullYear();
    let dayString = day > 9 ? day : "0"+day;
    let monthString = month > 9 ? month : "0"+month;  
    let nextFolio = branchRentals.length+1
    nextFolio = nextFolio<10 ? "0000"+String(nextFolio) : nextFolio;
    nextFolio = nextFolio>10 && nextFolio < 100? "000"+String(nextFolio) : nextFolio;
    nextFolio = nextFolio>100 && nextFolio < 1000? "00"+String(nextFolio) : nextFolio;
    let branchCode = activeBranch.code;
    rental.folio = branchCode+"-"+year+monthString+dayString+"-"+String(nextFolio)


    await rental.save()
    await rental.populate(
        [{path: 'branchId', select: 'name code'},
        {path: 'carId', select: 'name ipAddress'}]
        ); 
      
    //await saveHistory(loggedUser,"CREATED","Branch",branch)
    activeCar.isStarted=true;
    activeCar.startDate = new Date(); 
    activeCar.rentalTime = rental.planType.time;   
    let minutesDate = new Date ()
    let expiration = addMinutes(minutesDate,rental.planType.time);
    activeCar.expireDate = expiration;   

    await activeCar.save();
    const rentalObj = await rental.toObject()
    // if (rentalObj.branchId){
    //     rentalObj.branchCode=rentalObj.branchId.code ? rentalObj.branchId.code :"";
    //     rentalObj.branchName=rentalObj.branchId.name ? rentalObj.branchId.name :"";
    //     delete rentalObj.branchId;
    // }

    // if (rentalObj.carId){
    //     rentalObj.carName=rentalObj.carId.name ? rentalObj.carId.name :"";        
    //     delete rentalObj.carId;
    // }
    
    delete rentalObj.__v

    reply.code(201).send({
        status: 'success',
        data:rentalObj
     })      


}

const rentalShow = async function (req, reply){
    const rental = await Rental.findOne({_id:req.params.id}).select('-createdAt -updatedAt -__v').populate('branchId', '_id name code');
    if (!rental){
        return reply.code(400).send({
            status: 'fail',
            message: 'Renta no encontrada'
        })        
    } 
    
    await rental.populate(
        [{path: 'branchId', select: 'name code'},
        {path: 'carId', select: 'name'}]
        ); 
        
    let rentalObj = await rental.toObject();            
    // if (rentalObj.branchId){
    //     rentalObj.branchCode=rentalObj.branchId.code ? rentalObj.branchId.code :"";
    //     rentalObj.branchName=rentalObj.branchId.name ? rentalObj.branchId.name :"";
    //     delete rentalObj.branchId;
    // }

    // if (rentalObj.carId){
    //     rentalObj.carName=rentalObj.carId.name ? rentalObj.carId.name :"";        
    //     delete rentalObj.carId;
    // }
    delete rentalObj.__v
    reply.code(200).send({
        status: 'success',
        data: rentalObj
    })   
    
}

const rentalList = async function (req, reply){
    // for (let [key, value] of Object.entries(req.query)) {
                
    //   if (value == "" || value==null) { 
    //     delete req.query[key]
    //   }      
    // }
    let searchQuery = {
        isDeleted: false,			
    };
    
    // let initialDate=new Date(req.query.initialDate)
    // console.log("Initial Date: ",initialDate)
    // console.log("FINAL DATE RECEIVED: ",req.query.finalDate)
    // let finalDate=new Date(req.query.finalDate)
    // console.log(finalDate)
    if (req.query.branchId){
        searchQuery['branchId']=ObjectId(req.query.branchId)
    }
    if (req.query.carId){
        searchQuery['carId']=ObjectId(req.query.carId)        
    }
    const options = {
        select: `-isDeleted -__v`, 
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
    
    let rentalsPaginated={};
    if(!req.query.search){        
        let allBranches = await Branch.find({});
        let allCars = await Car.find({});
        if(options.page!=null && options.limit!=null){
            rentalsPaginated.docs=[]
            let rentalsQuery = await Rental.paginate(searchQuery, options);             
            rentalsQuery.docs.forEach(rental => {
                let newObj={
                    _id:rental._id,
                    folio:rental.folio,
                    planType:rental.planType,
                    paymentType:rental.paymentType,
                    createdAt:rental.createdAt,
                    updatedAt:rental.updatedAt
                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(rental.branchId)
                })
                newObj.branchId={
                    _id : rental.branchId ? rental.branchId:"",
                    name: branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                } 
                delete rental.branchId;
                let carInfo = allCars.find(branch=>{
                    return String(branch._id) == String(rental.carId)
                })
                newObj.carId={
                    _id: rental.carId ? rental.carId :"",
                    name : carInfo && carInfo.name ? carInfo.name : "",  
                    color: carInfo && carInfo.color ? carInfo.color : "",  
                    modelo: carInfo && carInfo.modelId ? carInfo.modelId : "",               

                }
                delete rental.carId;
               
                rentalsPaginated.docs.push(newObj)                
            });
            rentalsPaginated.page=rentalsQuery.page;
            rentalsPaginated.perPage=rentalsQuery.limit;
            rentalsPaginated.totalDocs=rentalsQuery.totalDocs;
            rentalsPaginated.totalPages=rentalsQuery.totalPages;
            
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
            rentalsPaginated.docs=[]
            let rentalsQuery = await Rental.find(searchQuery).sort(sortOrder).lean();
            rentalsQuery.forEach(rental => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(rental.branchId)
                })
                let carInfo = allCars.find(branch=>{
                    return String(branch._id) == String(rental.carId)
                })
                let carId = rental.carId;
                let branchId = rental.branchId;
                rental.carId={
                    _id:carId? carId:"",
                    name:carInfo && carInfo.name ? carInfo.name : "",
                    color: carInfo && carInfo.color ? carInfo.color : "",  
                    modelo: carInfo && carInfo.modelId ? carInfo.modelId : "",               
                }
                
                //rentalsPaginated.docs.push(rental)            
                rental.branchId={
                    _id:branchId ? branchId :"",
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }

                
                //delete rental.branchId;                
                rentalsPaginated.docs.push(rental)                

                
            });
        }
        
        
        
        

        
    }
    else{
        // branchSearch = await Car.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // rentalsPaginated.totalDocs = branchSearch.length;
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
        dateMatchStage['$match']={'createdAt': {"$gte": initialDay,"$lte":finalDay}} }
        
        if (req.query.initialDate!=null && req.query.finalDate==null){        
            let initialDay=new Date(req.query.initialDate);
            dateMatchStage['$match']={'createdAt': {"$gte": initialDay}} 

        }
        if (req.query.finalDate!=null && req.query.initialDate==null){
            let finalDay= addDays(req.query.finalDate,1)
            dateMatchStage['$match']={'createdAt': {"$gte": finalDay}} 

        }

        if(dateMatchStage['$match']!=null){
            aggregateQuery.push(dateMatchStage)
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
                  "folio":1,
                  "planType":1,
                  "paymentType":1,
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
        

        let rentalsSearch = await Rental.aggregate(aggregateQuery);
        rentalsPaginated.docs = rentalsSearch;
        rentalsPaginated.totalDocs = rentalsPaginated.docs.length

        rentalsPaginated.page=req.query.page ? req.query.page : 1;
        rentalsPaginated.perPage=req.query.perPage ? req.query.perPage :rentalsPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : rentalsPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        rentalsPaginated.docs=paginateArray(rentalsSearch,limit,page);
        rentalsPaginated.totalPages = Math.ceil(rentalsPaginated.totalDocs / rentalsPaginated.perPage);

    }
    //if(!req.query.page || !req.query.perPage){

        let docs = JSON.stringify(rentalsPaginated.docs);    
        var rentals = JSON.parse(docs);
    
        let allModels= await Modelo.find({})
        rentals.forEach(rental=>{
            if (rental.carId && rental.carId.modelo){
                let modelInfo = allModels.find(modelo=>{
                    return String(modelo._id)==rental.carId.modelo
                })

                rental.carId.modelo = modelInfo && modelInfo.name ? modelInfo.name :""

            }
            
        })
    //}
    // else{
    //     cars=rentalsPaginated.docs
    // }
        
    

    reply.code(200).send({
        status: 'success',
        data: rentals,
        page: rentalsPaginated.page,
        perPage:rentalsPaginated.perPage,
        totalDocs: rentalsPaginated.totalDocs,
        totalPages: rentalsPaginated.totalPages,

    })

    
}

const branchRentalCashBalance = async function (req,reply){
    let branchInfo = await Branch.findOne({_id:req.params.id, isDeleted:false})
    if(!branchInfo){
        if (!branchInfo){
            return reply.code(400).send({
                status: 'fail',
                message: 'sucursal_no_encontrada'
            })        
        } 
    }

    let offset = await getOffsetSetting();              
    let today = new Date ();
    if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
        today.setHours(offset,0,0,0);    
        today.setHours(offset, 0, 0, 0);
    }
    else{
        today.setHours(0,0,0,0);
        today.setHours(0, 0, 0, 0);
    }

    let nextDay = addDays(today,1)
    console.log("TODAY: ",today);
    console.log("NEXT DAY: ",nextDay)
    
    let searchQuery = {
        isDeleted: false,
        branchId:ObjectId(req.params.id),
        createdAt:{"$gte": today,"$lte":nextDay}			
    };
    
    let rentalsQuery = await Rental.find(searchQuery)    
    let balanceObj={
        rentalType:'Efectivo',        
        quantity:0,
        total:0,
        branchName : branchInfo.name ? branchInfo.name :""

    }

    let cashRentals=[];
    if (rentalsQuery.length>0){
        cashRentals = rentalsQuery.filter(rental =>{
            return rental.paymentType== "Efectivo"
        })
        if (cashRentals.length>0){
            balanceObj.quantity=cashRentals.length
            cashRentals.forEach(cashRental=>{
                balanceObj.total = balanceObj.total + cashRental.planType.price
            })
            
        }
    }

    return reply.code(200).send({
        status: 'success',
        data: balanceObj

    })

    



}

const branchRentalsList = async function (req, reply){
    let branchInfo = await Branch.findOne({_id:req.params.id, isDeleted:false})
    if(!branchInfo){
        if (!branchInfo){
            return reply.code(400).send({
                status: 'fail',
                message: 'sucursal_no_encontrada'
            })        
        } 
    }

    let offset = await getOffsetSetting();              
    let today = new Date ();
    if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
        today.setHours(offset,0,0,0);    
        today.setHours(offset, 0, 0, 0);
    }
    else{
        today.setHours(0,0,0,0);
        today.setHours(0, 0, 0, 0);
    }

    let nextDay = addDays(today,1)
    // console.log("TODAY: ",today);
    // console.log("NEXT DAY: ",nextDay)

    console.log("TODAY: ",today)
    console.log("NEXT DAY:",nextDay)
    
    let searchQuery = {
        isDeleted: false,
        branchId:ObjectId(req.params.id),
        createdAt:{"$gte": today,"$lte":nextDay}			
    };    
    
    // console.log("SEARCH QUERY: ",searchQuery);
    // if (req.query.branchId){
    //     searchQuery['branchId']=ObjectId(req.query.branchId)
    // }
    // if (req.query.carId){
    //     searchQuery['carId']=ObjectId(req.query.carId)        
    // }
    const options = {
        select: `-isDeleted -__v`, 
    }
    



    // if (req.query.initialDate!=null && req.query.finalDate!=null){      
    //     let initialDay=new Date(req.query.initialDate);
    //     let finalDayToDate =new Date(req.query.finalDate)
    //     if(initialDay.getTime() > finalDayToDate.getTime()){
    //         return reply.code(400).send({
    //             status:'fail',
    //             message:'La fecha inicial no puede ser mayor que la fecha final'
    //         })
    //     }

    //     let finalDay= addDays(finalDayToDate,1)                
    //     searchQuery['createdAt']={"$gte": initialDay,"$lte":finalDay}
    // }
    // if (req.query.initialDate!=null && req.query.finalDate==null){        
    //     let initialDay=new Date(req.query.initialDate);
    //     searchQuery['createdAt']={"$gte": initialDay}

    // }
    // if (req.query.finalDate!=null && req.query.initialDate==null){
    //     let finalDay= addDays(req.query.finalDate,1)
    //     searchQuery['createdAt']={"$lte": finalDay}
    // }  

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
    let rentalsPaginated={};
    if(!req.query.search){        
        let allBranches = await Branch.find({});
        let allCars = await Car.find({});
        if(options.page!=null && options.limit!=null){
            rentalsPaginated.docs=[]
            let rentalsQuery = await Rental.paginate(searchQuery, options);             
            rentalsQuery.docs.forEach(rental => {
                let newObj={
                    _id:rental._id,
                    folio:rental.folio,
                    planType:rental.planType,
                    paymentType:rental.paymentType,
                    createdAt:rental.createdAt,
                    updatedAt:rental.updatedAt
                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(rental.branchId)
                })
                newObj.branchId={
                    _id : rental.branchId ? rental.branchId:"",
                    name: branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                } 
                delete rental.branchId;
                let carInfo = allCars.find(branch=>{
                    return String(branch._id) == String(rental.carId)
                })
                newObj.carId={
                    _id: rental.carId ? rental.carId :"",
                    name : carInfo && carInfo.name ? carInfo.name : "",                

                }
                delete rental.carId;
               
                rentalsPaginated.docs.push(newObj)                
            });
            rentalsPaginated.page=rentalsQuery.page;
            rentalsPaginated.perPage=rentalsQuery.limit;
            rentalsPaginated.totalDocs=rentalsQuery.totalDocs;
            rentalsPaginated.totalPages=rentalsQuery.totalPages;
            
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
            rentalsPaginated.docs=[]
            let rentalsQuery = await Rental.find(searchQuery).sort(sortOrder).lean();
            rentalsQuery.forEach(rental => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(rental.branchId)
                })
                let carInfo = allCars.find(branch=>{
                    return String(branch._id) == String(rental.carId)
                })
                let carId = rental.carId;
                let branchId = rental.branchId;
                rental.carId={
                    _id:carId? carId:"",
                    name:carInfo && carInfo.name ? carInfo.name : "",
                }
                
                //rentalsPaginated.docs.push(rental)            
                rental.branchId={
                    _id:branchId ? branchId :"",
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }

                
                //delete rental.branchId;                
                rentalsPaginated.docs.push(rental)                

                
            });
        }
        
        
        
        

        
    }
    else{
        // branchSearch = await Car.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // rentalsPaginated.totalDocs = branchSearch.length;
        let diacriticSearch = diacriticSensitiveRegex(req.query.search);
        let searchString = '.*'+diacriticSearch+'.*';


  //    let searchString = '.*'+req.query.search+'.*';
        delete options.select;
        // let dateMatchStage={};
        let aggregateQuery=[{
            '$match': {
              'isDeleted': false,
              'branchId':ObjectId(req.params.id),
              'createdAt':{"$gte": today,"$lte":nextDay}			
            }
        }];

        

        // if(req.query.branchId){
        //     aggregateQuery.push({
        //         '$match': {
        //           'branchId': ObjectId(req.query.branchId)
        //         }
        //     })
        // }

        // if(req.query.carId){
        //     aggregateQuery.push({
        //         '$match': {
        //           'branchId': ObjectId(req.query.carId)
        //         }
        //     })
            
        // }
        // if (req.query.initialDate!=null && req.query.finalDate!=null){        
        // let initialDay=new Date(req.query.initialDate);
        // let finalDayToDate =new Date(req.query.finalDate)
        // if(initialDay.getTime() > finalDayToDate.getTime()){
        //     return reply.code(400).send({
        //         status:'fail',
        //         message:'La fecha inicial no puede ser mayor que la fecha final'
        //     })
        // }

        // let finalDay= addDays(finalDayToDate,1)        
        // dateMatchStage['$match']={'createdAt': {"$gte": initialDay,"$lte":finalDay}} }
        
        // if (req.query.initialDate!=null && req.query.finalDate==null){        
        //     let initialDay=new Date(req.query.initialDate);
        //     dateMatchStage['$match']={'createdAt': {"$gte": initialDay}} 

        // }
        // if (req.query.finalDate!=null && req.query.initialDate==null){
        //     let finalDay= addDays(req.query.finalDate,1)
        //     dateMatchStage['$match']={'createdAt': {"$gte": finalDay}} 

        // }

        // if(dateMatchStage['$match']!=null){
        //     aggregateQuery.push(dateMatchStage)
        // }
        
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
                  "folio":1,
                  "planType":1,
                  "paymentType":1,
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

        let rentalsSearch = await Rental.aggregate(aggregateQuery);
        rentalsPaginated.docs = rentalsSearch;
        rentalsPaginated.totalDocs = rentalsPaginated.docs.length

        rentalsPaginated.page=req.query.page ? req.query.page : 1;
        rentalsPaginated.perPage=req.query.perPage ? req.query.perPage :rentalsPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : rentalsPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        rentalsPaginated.docs=paginateArray(rentalsSearch,limit,page);
        rentalsPaginated.totalPages = Math.ceil(rentalsPaginated.totalDocs / rentalsPaginated.perPage);

    }
    //if(!req.query.page || !req.query.perPage){

        let docs = JSON.stringify(rentalsPaginated.docs);    
        var rentals = JSON.parse(docs);
        

    //}
    // else{
    //     cars=rentalsPaginated.docs
    // }
        
    

    reply.code(200).send({
        status: 'success',
        data: rentals,
        page: rentalsPaginated.page,
        perPage:rentalsPaginated.perPage,
        totalDocs: rentalsPaginated.totalDocs,
        totalPages: rentalsPaginated.totalPages,

    })

    
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

function diacriticSensitiveRegex(string = '') {
    return string.replace(/a/g, '[a,á,à,ä,â]')
       .replace(/e/g, '[e,é,ë,è]')
       .replace(/i/g, '[i,í,ï,ì]')
       .replace(/o/g, '[o,ó,ö,ò]')
       .replace(/u/g, '[u,ü,ú,ù]');
}


module.exports = { rentalCreate, rentalShow, rentalList, branchRentalsList, branchRentalCashBalance}