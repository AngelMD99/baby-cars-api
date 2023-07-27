const Inventory = require('../models/Inventory');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const inventoryCreate = async function (req,reply){
    let modelValidation= isValidObjectId(req.body.modelId)
    if (modelValidation==false){
        return reply.code(400).send({
            status: 'fail',
            message: 'Modelo no válido'
        })
    }
    if(!req.body.color){
        return reply.code(400).send({
            status: 'fail',
            message: 'El color es requerido'
        })
    }

    let currentModel = await Modelo.findOne({_id:req.body.modelId, isDeleted:false})
    let lowerColors=[];
    currentModel.colors.forEach(color => {
        lowerColors.push(color.toLowerCase())        
    });
    
    if (!lowerColors.includes(req.body.color.toLowerCase()) ) {
        return reply.code(400).send({
            status: 'fail',
            message: 'El color proporcionado no es valido para el modelo'
        })
    }

    let inventoryValidation = await Inventory.findOne({
        modelId:req.body.modelId,
        isDeleted:false,
        color:req.body.color.toLowerCase()
    })

    if (inventoryValidation){
        return reply.code(400).send({
            status: 'fail',
            message: 'Ya existe un registro de inventario para el modelo y color'
        })
    }

    const inventory = new Inventory();
    inventory.modelId  = req.body.modelId;
    inventory.color  = req.body.color.toLowerCase();
    inventory.quantity  = req.body.quantity ? req.body.quantity : 0;
    await inventory.save()
    await inventory.populate([        
        {path:'modelId', select:'_id name'}
    ]);    
    
    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const inventoryObj = await inventory.toObject()
    if(!inventoryObj.modelId || !inventoryObj.modelId._id){
        inventoryObj.modelId={
            _id:null,
            name:"",            
        }
    }
    delete inventoryObj.__v

    reply.code(201).send({
        status: 'success',
        data: inventoryObj
     }) 



}

const inventoryList = async function (req,reply){

}

const inventoryShow = async function (req,reply){
    const inventory = await Inventory.findOne({_id:req.params.id, isDeleted:false}).select('-createdAt -updatedAt -__v');
    if (!inventory){
        return reply.code(400).send({
            status: 'fail',
            message: 'Inventario no registrado'
        })        
    } 
    
    await inventory.populate([        
        {path:'modelId', select:'_id name'}
    ]);  
    let inventoryObj = await inventory.toObject();            
    
    // if (inventoryObj.branchId){
    //     inventoryObj.branchCode=inventoryObj.branchId.code ? inventoryObj.branchId.code :"";
    //     inventoryObj.branchName=inventoryObj.branchId.name ? inventoryObj.branchId.name :"";
    //     delete inventoryObj.branchId;
    // }    
    if(!inventoryObj.modelId || !inventoryObj.modelId._id){
        inventoryObj.modelId={
            _id:null,
            name:""            
        }
    }
    reply.code(200).send({
        status: 'success',
        data: inventoryObj
    }) 

}

const inventoryDelete = async function (req,reply){
    let currentInventory = await Inventory.findOne({_id: req.params.id, isDeleted:false});
    if(currentInventory == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Inventario no registrado'
        })
    }

    let updatedInventory = await Inventory.findOne({_id: req.params.id, isDeleted:false}).select('-__v');
    updatedInventory.isDeleted=true;
    await updatedInventory.save();
    reply.code(200).send({
        status: 'success',
        message: 'Inventario eliminado correctamente'           
        
    }) 

}

const inventoryUpdate = async function (req,reply){
    let currentInventory = await Inventory.findOne({_id: req.params.id, isDeleted:false});
    if(currentInventory == null){
        return reply.code(400).send({
            status: 'fail',
            message: 'Inventario no registrado'
        })
    }    
    let validActions =['adjust','add']

    if (!req.body.action){
        return reply.code(400).send({
            status: 'fail',
            message: 'Se requiere la acción a realizar'
        })
    }

    if (!validActions.includes(req.body.action.toLowerCase())){
        return reply.code(400).send({
            status: 'fail',
            message: 'No se indico una acción valida'
        })
    }
    
    let currentQuantity = currentInventory.quantity;
    let receivedQuantity = req.body.quantity ? req.body.quantity : 0

    if (req.body.action=='adjust'){
        currentQuantity = receivedQuantity;
    }
    if (req.body.action=='add'){
        currentQuantity += receivedQuantity;
    }


    // let updatedInventory = await Inventory.findByIdAndUpdate({_id: req.params.id},inputs,{
    //     new:true,
    //     overwrite:true
    // }).select('-__v');    

    let updatedInventory = await Inventory.findOne({_id: req.params.id, isDeleted:false});
    updatedInventory.quantity = currentQuantity;    

    await updatedInventory.save();
    await updatedInventory.populate([
        {path:'modelId', select:'_id name'}
    ]);  
    let updatedInventoryObj = await updatedInventory.toObject();                
    if(!updatedInventoryObj.modelId || !updatedInventoryObj.modelId._id){
        updatedInventoryObj.modelId={
            _id:null,
            name:""            
        }
    }  
    delete updatedInventoryObj.__v   
    reply.code(200).send({
        status: 'success',
        data: updatedInventoryObj                   
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


module.exports = { inventoryCreate, inventoryDelete, inventoryList, inventoryUpdate, inventoryShow  }