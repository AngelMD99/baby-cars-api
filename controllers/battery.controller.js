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
            let activeCar = await Car.findOne({_id:car.carId, isDeleted:false})
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