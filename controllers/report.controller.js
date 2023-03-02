const Rental = require('../models/Rental');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const rentalsReport = async function (req, reply){

}




module.exports = { rentalsReport}