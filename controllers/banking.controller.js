const Banking = require('../models/Banking');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const createBanking = async function (req, reply){
    if(req.body.branchId!=null && req.body.branchId!=""){        
        let branchValidation= isValidObjectId(req.body.branchId)
        if (branchValidation==false){
            return reply.code(400).send({
                status: 'fail',
                message: 'Sucursal no válida'
            })
        }
        else{
            let activeBranch= await Branch.findOne({_id:req.body.branchId,isDeleted:false})
            if(!activeBranch){
                return reply.code(400).send({
                    status: 'fail',
                    message: 'Sucursal no encontrada'
                })

            }
        }
    } 
    let branchId = req.body.branchId;    
    const banking = new Banking(req.body)
    if(branchId){
        banking.branchId=branchId;
    }

    banking._id = mongoose.Types.ObjectId();
    await banking.save()
    await banking.populate([
        {path:'branchId', select:'_id name code'},
    ]); 
    
    

    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const bankingObj = await banking.toObject()
    // if (bankingObj.branchId){
    //     bankingObj.branchCode=bankingObj.branchId.code ? bankingObj.branchId.code :"";
    //     bankingObj.branchName=bankingObj.branchId.name ? bankingObj.branchId.name :"";
    //     delete bankingObj.branchId;
    // }
    if(!bankingObj.branchId || !bankingObj.branchId._id){
        bankingObj.branchId={
            _id:null,
            name:"",
            code:"",
        }
    }
    delete bankingObj.__v

    reply.code(201).send({
        status: 'success',
        data: bankingObj
     })  
}


const showBanking = async function (req, reply){
    const banking = await Banking.findOne({_id:req.params.id}).select('-createdAt -updatedAt -__v').populate('branchId', '_id name code');
    if (!banking){
        return reply.code(400).send({
            status: 'fail',
            message: 'Cuenta bancaria no registrada'
        })        
    } 
    
    await banking.populate([
        {path:'branchId', select:'_id name code'},
    ]);  
    let bankingObj = await banking.toObject();            
    
    // if (bankingObj.branchId){
    //     bankingObj.branchCode=bankingObj.branchId.code ? bankingObj.branchId.code :"";
    //     bankingObj.branchName=bankingObj.branchId.name ? bankingObj.branchId.name :"";
    //     delete bankingObj.branchId;
    // }
    if(!bankingObj.branchId || !bankingObj.branchId._id){
        bankingObj.branchId={
            _id:null,
            name:"",            
        }
    }
    
    reply.code(200).send({
        status: 'success',
        data: bankingObj
    })   


}
const deleteBanking = async function (req, reply){
    let currentBanking = await Banking.findOne({_id: req.params.id, isDeleted:false});
    if(currentBanking == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Cuenta bancaria no registrado'
        })
    }

    let updatedBanking = await Banking.findOne({_id: req.params.id, isDeleted:false}).select('-__v');
    updatedBanking.isDeleted=true;
    await updatedBanking.save();
    reply.code(200).send({
        status: 'success',
        message: 'Cuenta '+updatedBanking.account+' de '+updatedBanking.bank+' eliminada correctamente'           
        
    })   
}


const listBankings = async function (req, reply){
    let searchQuery = {
        isDeleted: false,			
    };
    if(req.params.id && !req.query.branchId){
        searchQuery['branchId']=req.params.id
        searchQuery['isStarted']=true
    }

    if(!req.params.id && req.query.branchId){
        searchQuery['branchId']=req.query.branchId
    }

    const options = {
        select: `-isDeleted -__v -updatedAt -createdAt`, 

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
        options.sort={"name":1}
    }
    let bankingsPaginated={};
    if(!req.query.search){         
        //let sortOrder={name:1}       
        
        let allBranches = await Branch.find({});
        if(options.page!=null && options.limit!=null){
            bankingsPaginated.docs=[];
            let bankingsQuery = await Banking.paginate(searchQuery, options);
            bankingsQuery.docs.forEach(banking => {
                let newObj={
                    _id:banking._id,
                    isDeleted:banking.isDeleted,                    
                    bank:banking.bank,
                    account:banking.account,
                    reference:banking.reference,                    
                }
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(banking.branchId)
                })
                newObj.branchId={
                    _id:banking.branchId ? banking.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",

                }               
                
                delete banking.branchId;
                delete banking.modelId;                
                bankingsPaginated.docs.push(newObj)                               
            });
            bankingsPaginated.page=bankingsQuery.page;
            bankingsPaginated.perPage=bankingsQuery.limit;
            bankingsPaginated.totalDocs=bankingsQuery.totalDocs;
            bankingsPaginated.totalPages=bankingsQuery.totalPages;
        }
        else{
            let sortOrder = {}
            if(req.query.column){                
                sortOrder[req.query.column] = req.query.order == "desc" ? -1:1
            }
            else{
                sortOrder ={
                    bank:1
                }
            }
            bankingsPaginated.docs=[]
            let bankingsQuery = await Banking.find(searchQuery).sort(sortOrder).lean();
            bankingsQuery.forEach(banking => {
                let branchInfo = allBranches.find(branch=>{
                    return String(branch._id) == String(banking.branchId)
                }) 
                let branchId={
                    _id:banking.branchId ? banking.branchId :null,
                    name : branchInfo && branchInfo.name ? branchInfo.name : "",
                    code : branchInfo && branchInfo.code ? branchInfo.code : "",
                }  
                banking.branchId=branchId;         
                // banking.branchName = branchInfo && branchInfo.name ? branchInfo.name : "",
                // banking.branchCode = branchInfo && branchInfo.code ? branchInfo.code : "",
                // delete banking.branchId;                
                bankingsPaginated.docs.push(banking)              

                
            });
        }
        
        
        
        

        
    }
    else{
        // branchSearch = await Car.search(req.query.search, { isDeleted: false }).collation({locale: "es", strength: 3}).select(options.select);
        // bankingsPaginated.totalDocs = branchSearch.length;
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
                '$project': {
                  'bank':1,
                  //'branchId': 1,                   
                  'account': 1, 
                  'reference': 1,                  
                  'branchId._id': {
                    '$first': '$branchInfo._id'
                  },
                  'branchId.code': {
                    '$first': '$branchInfo.code'
                  } ,
                  'branchId.name': {
                    '$first': '$branchInfo.name'
                  },
                  

                }
              }, {
                '$match': {
                  '$or': [
                    {
                      'bank': {
                        '$regex': searchString, 
                        '$options': 'i'
                      }
                    }, {
                      'account': {
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
        let bankingsSearch = await Banking.aggregate(aggregateQuery);
        bankingsPaginated.docs = bankingsSearch;
        bankingsPaginated.totalDocs = bankingsPaginated.docs.length

        bankingsPaginated.page=req.query.page ? req.query.page : 1;
        bankingsPaginated.perPage=req.query.perPage ? req.query.perPage :bankingsPaginated.totalDocs;
        let limit = req.query.perPage ? req.query.perPage : bankingsPaginated.totalDocs;
        let page = req.query.page ? req.query.page : 1;
        bankingsPaginated.docs=paginateArray(bankingsSearch,limit,page);
        
        bankingsPaginated.docs.forEach(doc=>{
            if (!doc.branchId || !doc.branchId._id){
                doc.branchId ={
                    _id:null,
                    code:"",
                    name:""
                }
            }

        })
        bankingsPaginated.totalPages = Math.ceil(bankingsPaginated.totalDocs / bankingsPaginated.perPage);

    }

    let docs = JSON.stringify(bankingsPaginated.docs);    
    var bankings = JSON.parse(docs);
    

    reply.code(200).send({
        status: 'success',
        data: bankings,
        page: bankingsPaginated.page,
        perPage:bankingsPaginated.perPage,
        totalDocs: bankingsPaginated.totalDocs,
        totalPages: bankingsPaginated.totalPages,

    })


    
}

const updateBanking = async function (req, reply){    
    //let loggedUser = await req.jwtVerify();
    if(req.body.branchId!=null && req.body.branchId!=""){        
        let branchValidation= isValidObjectId(req.body.branchId)
        if (branchValidation==false){
            return reply.code(400).send({
            status: 'fail',
            message: 'Sucursal no válida'
        })
    }
    else{
        let activeBranch= await Branch.findOne({_id:req.body.branchId,isDeleted:false})
        if(!activeBranch){
            return reply.code(400).send({
                status: 'fail',
                message: 'Sucursal no encontrada'
            })

            }
        }
    }  
    let currentBanking = await Banking.findOne({_id: req.params.id, isDeleted:false});
    if(currentBanking == null){
        return reply.code(400).send({
        status: 'fail',
        message: 'Cuenta bancaria no registrada'
        })
    }   
    let inputs={};

    if(req.body.branchId && req.body.branchId!=""){
        inputs.branchId = req.body.branchId;
    }
    inputs.bank = req.body.bank;
    inputs.account = req.body.account;
    inputs.reference = req.body.reference;    
    let updatedBanking = await Banking.findByIdAndUpdate({_id: req.params.id},inputs,{
        new:true,
        overwrite:true
    }).select('-__v');    

    await updatedBanking.save();
    await updatedBanking.populate([
        {path:'branchId', select:'_id name code'},
    ]);  
    let updatedBankingObj = await updatedBanking.toObject();            
    if(!updatedBankingObj.branchId || !updatedBankingObj.branchId._id){
        updatedBankingObj.branchId={
            _id:null,
            name:"",            
        }
    }  
    delete updatedBankingObj.__v
    reply.code(200).send({
        status: 'success',
        data: updatedBankingObj
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

module.exports = { createBanking, deleteBanking, showBanking, updateBanking, listBankings }


