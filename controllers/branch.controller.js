const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const branchCreate = async function (req, reply){

}

const branchShow = async function (req, reply){
    
}

const branchUpdate = async function (req, reply){
    
}

const branchDelete = async function (req, reply){
    
}

const branchList = async function (req, reply){
    
}

const branchLogin = async function (req, reply){
    
}


module.exports = { branchCreate, branchShow, branchUpdate, branchDelete, branchList, branchLogin}
//module.exports = { branchList, branchData, branchIn, branchSchedules, branchOrders, branchChangeOrderStatus, branchDiscardOrder, branchProducts, branchOptions, getbranchProducts, branchProductsStatus, branchProductsOptions }