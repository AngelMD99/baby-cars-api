const Rental = require('../models/Rental');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const rentalCreate = async function (req, reply){

}

const rentalShow = async function (req, reply){
    
}

const rentalList = async function (req, reply){
    
}


module.exports = { rentalCreate, rentalShow, rentalList}