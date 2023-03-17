const Rental = require('../models/Rental');
const Branch = require('../models/Branch');
const Car = require('../models/Car');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const { getOffsetSetting } = require('../controllers/base.controller')

const rentalCreate = async function (req, reply){

    
    let branchValidation= isValidObjectId(req.body.branchId._id)
        if (branchValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Sucursal no válida'
            })
    }
    
    let activeBranch= await Branch.findOne({_id:req.body.branchId._id,isDeleted:false})
        if(!activeBranch){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Sucursal no encontrada'
                })

        }
       
    
    //if(req.body.carId!=null){        
        let carValidation= isValidObjectId(req.body.carId._id)
        if (carValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Carrito no válido'
            })
        }
        //else{
            let activeCar= await Car.findOne({_id:req.body.carId._id,isDeleted:false})
            if(!activeCar){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Carrito no encontrado'
                })
            }
            if(activeCar.isStarted){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Carrito '+activeCar.name+' esta encendido'
                })

            }
        //}
    //}
    let branchId = mongoose.Types.ObjectId(req.body.branchId._id);
    let carId= mongoose.Types.ObjectId(req.body.carId._id);
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
    if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
        date.setHours(offset,0,0,0);    
        date.setHours(offset, 0, 0, 0);
    }
    else{
        date.setHours(0,0,0,0);
        date.setHours(0, 0, 0, 0);
    }

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
        {path: 'carId', select: 'name'}]
        ); 
      
    //await saveHistory(loggedUser,"CREATED","Branch",branch)
    activeCar.isStarted=true;
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
        data: rentalObj
     })      


}

const rentalShow = async function (req, reply){
    const rental = await Rental.findOne({_id:req.params.id}).select('-createdAt -updatedAt -__v').populate('branchId', '_id name code');
    if (!rental){
        return reply.code(400).send({
            status: 'fail',
            message: 'Rental no encontrada'
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
    let searchQuery = {
        isDeleted: false,			
    };
    const options = {
        select: `-isDeleted -__v -updatedAt -createdAt`, 

    }
    if (req.query.page){
        options.page = req.query.page;
    }
    if (req.query.page){
        options.limit = req.query.perPage;
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
                    paymentType:rental.paymentType
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
            rentalsPaginated.docs=[]
            let rentalsQuery = await Rental.find(searchQuery).lean();
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
          let aggregateQuery=[
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
                  'branchCode': {
                    '$first': '$branchInfo.code'
                  },
                  'branchName': {
                    '$first': '$branchInfo.name'
                  },
                  'carName': {
                    '$first': '$carInfo.name'
                  }  

                }
              }, {
                '$match': {
                  '$or': [
                    {
                      'branchCode': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    }, {
                      'branchName': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    },
                    {
                        'carName': {
                          '$regex': searchString, 
                          '$options': 'i'
                        }
                      },
                      
                  ]
                }
              }
            ]

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
        var cars = JSON.parse(docs);
    //}
    // else{
    //     cars=rentalsPaginated.docs
    // }
        
    

    reply.code(200).send({
        status: 'success',
        data: cars,
        page: rentalsPaginated.page,
        perPage:rentalsPaginated.perPage,
        totalDocs: rentalsPaginated.totalDocs,
        totalPages: rentalsPaginated.totalPages,

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


module.exports = { rentalCreate, rentalShow, rentalList}