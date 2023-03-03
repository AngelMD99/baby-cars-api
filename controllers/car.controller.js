const Car = require('../models/Car');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const carCreate = async function (req, reply){
        
    //let theCode = req.body.branchCode.toUpperCase();  
    let ipValidation = await Car.findOne({ipAddress: req.body.ipAddress.toUpperCase(), isDeleted:false})
    if(ipValidation != null){
        return reply.code(400).send({
            status: 'fail',
            message: 'la_direccion_ip_ya_esta_en_uso'
        })
    }    

    if(req.body.ipAddress.indexOf(' ') >= 0){
            return reply.code(400).send({
                status: 'fail',
                message: 'no_se_permiten_espacios_en_blanco_en_la_direccion_ip'
            })
    }      
    
    const car = new Car(req.body);    
    car._id = mongoose.Types.ObjectId();
    await car.save()

    //await saveHistory(loggedUser,"CREATED","Branch",branch)

    const carObj = await car.toObject()

    reply.code(201).send({
        status: 'success',
        data: carObj
     })      

}

const carShow = async function (req, reply){
    
}

const carUpdate = async function (req, reply){
    
}

const carDelete = async function (req, reply){
    
}

const carList = async function (req, reply){
    
}

const carStart = async function (req, reply){
    
}
const carStop = async function (req, reply){
    
}


module.exports = { carCreate, carShow, carUpdate, carDelete, carList, carStart, carStop}