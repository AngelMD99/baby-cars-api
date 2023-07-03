const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

const clientSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },    
},{
    timestamps: true,
  }
)

clientSchema.index({ fullName: "text", email: "text", phone:"text" })
clientSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Client', clientSchema)