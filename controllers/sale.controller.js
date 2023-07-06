const Sale = require('../models/Sale');
const Branch = require('../models/Branch');
const Car = require('../models/Car');
const Modelo = require('../models/Modelo');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const { getOffsetSetting } = require('../controllers/base.controller');
const { findOneAndDelete } = require('../models/Branch');

const saleCreate = async function (req, reply){

}

const saleShow = async function (req, reply){

}

const saleList = async function (req, reply){

}

const saleDelete = async function (req, reply){

}

const saleUpdate = async function (req, reply){

}

const addPayment = async function (req, reply){

}


function addMinutes(date, minutes) {    
    date.setMinutes(date.getMinutes() + minutes);  
 
    return date;
}

function addDays(date, days) {
    var newDate = new Date(date.valueOf());
    newDate.setDate(newDate.getDate() + days);
    return newDate;
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


module.exports = { saleCreate, saleDelete, saleList, saleShow, saleUpdate, addPayment}


