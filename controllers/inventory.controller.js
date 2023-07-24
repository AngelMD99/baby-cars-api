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

const inventoryDelete = async function (req,reply){

}

const inventoryAdd = async function (req,reply){

}

const inventoryUpdate = async function (req,reply){

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


module.exports = { inventoryCreate, inventoryDelete, inventoryList, inventoryUpdate, inventoryAdd }