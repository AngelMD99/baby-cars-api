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
        enum:['admin', 'employee']
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    
},{
    timestamps: true,
  }
)

userSchema.index({ fullName: "text", email: "text" })

userSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('User', userSchema)