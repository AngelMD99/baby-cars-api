const Balance = require('../models/Balance');
const Status = require('../models/Status');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
const Car = require('../models/Car');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const balanceCreate = async function (req,reply){

}

const balanceShow = async function (req,reply){
    
}

const balanceList = async function (req,reply){
    
}

const balanceDelete = async function (req,reply){
    
}

const balanceUpdate = async function (req,reply){
    
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

module.exports = { balanceCreate, balanceDelete, balanceList, balanceShow, balanceUpdate}