const Balance = require('../models/Balance');
const Status = require('../models/Status');
const Branch = require('../models/Branch');
const Rental = require('../models/Branch');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
const Modelo = require('../models/Modelo');
const Car = require('../models/Car');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const { getOffsetSetting } = require('../controllers/base.controller');

const balanceRentalsCreate = async function (req,reply){
    let branchInfo = await Branch.findOne({_id:req.params.id, isDeleted:false})
    if(!branchInfo){
        if (!branchInfo){
            return reply.code(400).send({
                status: 'fail',
                message: 'sucursal_no_encontrada'
            })        
        } 
    }

    let offset = await getOffsetSetting(); 
    let today = new Date ();
    if (process.env.ENVIRONMENT=='production'|| process.env.ENVIRONMENT=='development'){
        today.setHours(today.getHours() - offset);    
        today.setHours(offset,0,0,0);    
        today.setHours(offset, 0, 0, 0);
    }
    else{
        today.setHours(0,0,0,0);
        today.setHours(0, 0, 0, 0);
    }

    let nextDay = addDays(today,1);
    let searchQuery = {
        isDeleted: false,
        branchId:ObjectId(req.params.id),
        createdAt:{"$gte": today,"$lte":nextDay},
        paymentType: "Efectivo"			
    };

    let rentalsQuery = await Rental.find(searchQuery) 

    const decoded = await req.jwtVerify();
    let balanceObj={
        balanceType:'rentals',
        branchId:req.query.branchId,
        userId: decoded._id,
        loginDate:decoded.lastLogin,
        logoutDate:new Date(),
        amount:0,
        total:0

    };

    if (rentalsQuery.length>0){
        balanceObj.quantity=cashRentals.length
        cashRentals.forEach(cashRental=>{
        balanceObj.total = balanceObj.total + cashRental.planType.price
        })           
        
    }

    const balance = new Balance(balanceObj);
    balance._id = new mongoose.Types.ObjectId();
    await balance.save();
    await balance.populate([
        { path:'branchId',select:'name code'},
        { path:'userId',select:'fullName email phone'}
    ])

    const balanceSavedObj = await balance.toObject()
    delete balanceSavedObj._v;
    reply.code(201).send({
        status: 'success',
        data:balanceSavedObj
    })      

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

module.exports = { balanceRentalsCreate, balanceDelete, balanceList, balanceShow, balanceUpdate}