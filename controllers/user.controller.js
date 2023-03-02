const User = require('../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var Moment = require('moment-timezone');
let environment=process.env.ENVIRONMENT
Moment().tz("Etc/Universal");

const userLogin = async function (req, reply) {    
    const user = await User.findOne({email: req.body.email, isDeleted:false});

    if(user == null){
        return reply.code(404).send({
            status: 'fail',
            message: 'user_not_found'
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
                message: 'incorrect_password'
            })
        }

        let today = new Date();
        let offset = await getOffsetSetting();              
        today.setHours(today.getHours() - offset);
        let expirationDate = new Date(user.tempPasswordExpiration)

        if(!bcrypt.compareSync(req.body.password, user.tempPassword)){
            return reply.code(401).send({
                status: 'fail',
                message: 'incorrect_password'
            })
        }
        else{
            if(today>expirationDate){
                return reply.code(401).send({
                    status: 'fail',
                    message: 'temporary_password_expired'
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
// const userCreate = async function (req, reply){

// }

module.exports = { userLogin }