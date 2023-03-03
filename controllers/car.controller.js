const Car = require('../models/Car');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const carCreate = async function (req, reply){

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