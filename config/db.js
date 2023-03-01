const mongoose = require('mongoose');

mongoose.connect(`mongodb://${process.env.DB_HOST}/${process.env.DB_DATABASE}`, {useNewUrlParser: true})
 .then(() => console.log('MongoDB connected…'))
 .catch(err => console.log(err))