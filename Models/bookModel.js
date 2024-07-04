const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true,
    },
    publishYear: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    bookImg: {
        type: String,
        required: false,
    },
    description:{
        type:String,
        required:true,
    },
    
});

const Book = mongoose.model("Book", BookSchema);
module.exports = Book;
