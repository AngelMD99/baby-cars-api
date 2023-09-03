const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

const userSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        required: true,
        enum:['admin', 'employee','supervisor']
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch", 
    },
    username:{
        type:String
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone:{
        type: Number,
    },    
    password: {
        type: String,
        required: true
    },
    lastLogin: Date,
    lastLogOut: Date
    
},{
    timestamps: true,
  }
)

userSchema.index({ fullName: "text", email: "text" })

userSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('User', userSchema)