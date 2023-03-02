const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

const branchSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    name: {
        type: String,
        required: true
    },
    location: {
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

userSchema.index({ name: "text" })

userSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Branch', branchSchema)