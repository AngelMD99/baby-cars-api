const User = require('../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");
const { getOffsetSetting } = require('../controllers/base.controller')


const userLogin = async function (req, reply) {    
    const user = await User.findOne({email: req.body.email, isDeleted:false});

    if(user == null){
        return reply.code(404).send({
            status: 'fail',
            message: 'Usuario no encontrado'
        })
    }

    // if(user.isEnabled == false){
    //     return reply.code(404).send({
    //         status: 'fail',
    //         message: 'user_disabled'
    //     })
    // }

    if(!bcrypt.compareSync(req.body.password, user.password)){



        if(!user.tempPassword || !user.tempPasswordExpiration){
            return reply.code(401).send({
                status: 'fail',
                message: 'Contraseña incorrecta'
            })
        }

        let today = new Date();
        let offset = await getOffsetSetting();              
        today.setHours(today.getHours() - offset);
        let expirationDate = new Date(user.tempPasswordExpiration)

        if(!bcrypt.compareSync(req.body.password, user.tempPassword)){
            return reply.code(401).send({
                status: 'fail',
                message: 'Contraseña incorrecta'
            })
        }
        else{
            if(today>expirationDate){
                return reply.code(401).send({
                    status: 'fail',
                    message: 'Contraseña temporal expirada'
                })

            }
        }


    }

    // if(req.body.cmsLogin == true){
    //     let today = new Date();
    //     user.lastCMSAccess = today;
    //     await user.save();
    
    // }

    const timestamp = parseInt((new Date().getTime() / 1000).toFixed(0));
    this.jwt.sign({_id: user._id, role:user.role, isDeleted:user.isDeleted, timestamp: timestamp}, async (err, token) => {
        if (err) return reply.send(err)

        if (user.branchId){
            await user.populate([
                {path:'branchId', select:'_id name code'},
            ]); 
             
        }
        let userObj = user.toObject()       


        delete userObj.password;

        reply.code(200).send({
            status: 'success',
            data: {
                token: token,
                user: userObj
            }
        }) 
    })
}

const userCreate = async function (req, reply){

}

const userList = async function (req, reply){

}

const userDelete = async function (req, reply){

}

const userUpdate = async function (req, reply){

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

module.exports = { userLogin }