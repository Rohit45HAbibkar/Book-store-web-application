const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const app = express();
const PORT = 8080;
const URL = "mongodb://127.0.0.1:27017/Book-Store";
const Book = require("./Models/bookModel");
const User = require("./Models/user");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session"); 
const flash = require("connect-flash");
const UserProfile = require("./Models/userInfo");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Database connection
mongoose.connect(URL)
    .then(() => {
        console.log("Connected to database");
    })
    .catch((err) => {
        console.error("Database connection error:", err);
    });

// Setup express-session
app.use(session({
    secret: 'your secret',
    resave: false,
    saveUninitialized: true
}));

// Setup connect-flash
app.use(flash());

// Setup middleware to make flash messages available in templates
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Functions
const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next(); // User is authenticated, continue to next middleware or route handler
    }
    
    // If not authenticated, set flash error message and redirect to login page
    req.flash("error", "You must be logged in to access this page");
    res.redirect("/BookBytes/login");
};

const checkProfileCompleteness = async (req, res, next) => {
    if (req.isAuthenticated()) {
        const userProfile = await UserProfile.findOne({ email: req.user.email });
        if (userProfile && userProfile.isProfileComplete()) {
            return next();
        } else {
            req.flash("error", "Please complete your profile to continue");
            return res.redirect("/BookBytes/signup/userinfo");
        }
    } else {
        req.flash("error", "You must be logged in to access this page");
        return res.redirect("/BookBytes/login");
    }
};


















// -------------------------------------------login,logout,signup Route--------------------------------------------------------------

// Login routes
    app.get("/BookBytes/login", (req, res) => {
    res.render("login");
});

app.post("/BookBytes/login",passport.authenticate('local', {
    failureRedirect: '/BookBytes/login',
    failureFlash: true
}), (req, res) => {
    req.flash("success","Welcome back to BookBytes!");
    if(!checkProfileCompleteness){
    res.redirect("/BookBytes/signup/userinfo");}
    else{
        res.redirect("/BookBytes/book");
    }
});


//Logout route
app.get("/BookBytes/logout",(req,res)=>{
    req.logOut((error) =>{
        if(error) {
            next(error);
        }
        req.flash("success","you are logged out!");
        res.redirect("/BookBytes/home");
    })
})

//signUp route

app.get("/BookBytes/signup",(req,res)=>{
    res.render("signup");
})

app.post("/BookBytes/signup", async (req, res, next) => {
    const { username, email, password } = req.body;

    try {
        // Check if email already exists
        const emailCheck = await User.findOne({ email });
        if (emailCheck) {
            req.flash('error', 'Email already exists. Please choose a different email.');
            return res.redirect('/BookBytes/signup');
        }

        // Check if username already exists
        const usernameCheck = await User.findOne({ username });
        if (usernameCheck) {
            req.flash('error', 'Username already exists. Please choose a different username.');
            return res.redirect('/BookBytes/signup');
        }

        // Create a new user
        const newUser = new User({ username, email });
        const registeredUser = await User.register(newUser, password);
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', 'Sign up successful!');
            res.redirect("/BookBytes/signup/userinfo");
        });
    } catch (error) {
        console.error("Error signing up:", error);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/BookBytes/signup');
    }
});


























































// -------------------------------------------------home,contact Route------------------------------------------------------------------

//Home page
app.get("/BookBytes/home",(req,res)=>{
    const user = req.user;
    res.render("home.ejs", {user: user });
})
//Contact page
app.get("/BookBytes/contact", (req, res) => {
    const user = req.user; // Assuming user is stored in req.user when logged in
    res.render("contact", { user: user });
});

app.post("/BookBytes/contact", (req, res) => {
    const { name, email, message } = req.body;

    // Process the form data here (e.g., save to database, send email)
    // For now, we'll just log it to the console
    console.log(`Name: ${name}, Email: ${email}, Message: ${message}`);

    // Redirect to a thank you page or back to the contact form with a success message
    req.flash("success", "Thank you for your message! We will get back to you soon.");
    res.redirect("/BookBytes/contact");
});





























// ------------------------------------------------------userinfo route---------------------------------------------------

app.get("/BookBytes/signup/userinfo", isLoggedIn, (req, res) => {
    const user = req.user || {};
    res.render("additionalInfo", { user });
});

app.post("/BookBytes/signup/userinfo", isLoggedIn, async (req, res) => {
    try {
        const { fullName, bio, email, phoneNumber, gender, genres } = req.body;
        let newInfo = new UserProfile({
            fullName,
            bio,
            email,
            phoneNumber,
            gender,
            interestedGenres: genres
        });
        const emailCheck = await UserProfile.findOne({ email });
        if (emailCheck) {
            req.flash('error', 'Email already asociated with another account!');
            return res.redirect('/BookBytes/signup/userinfo');
        }
        await newInfo.save();
        req.flash("success", "Information saved successfully");
        res.redirect("/BookBytes/book");
    } catch (err) {
        console.error("Error saving user information:", err);
        req.flash("error", "An error occurred while saving information");
        res.redirect("/BookBytes/signup/userinfo");
    }
});


app.get("/BookBytes/book/profile", isLoggedIn, async (req, res) => {
    try {
        const user = await UserProfile.findOne({ email: req.user.email });
        res.render("profile", { user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        req.flash("error", "An error occurred while fetching your profile.");
        res.redirect("/BookBytes/book");
    }
});

























































app.post("/BookBytes/description", async (req, res) => {
    const bookId = req.body.bookId;

    try {
        const book = await Book.findById(bookId);
        if (book) {
            // Set default values if fields are empty or undefined
            if (!book.description || book.description.trim() === '') {
                book.description = "https://media.istockphoto.com/id/1292243589/vector/book-vector-icon-isolated-closed-book-notebook-with-blue-cover-flat-colored-illustration.jpg?s=612x612&w=0&k=20&c=SWBWdjhpk2EGPHPGD37dgEOZpScN4SSnUDMvBT7_hhs=";
            }
            if (!book.image || book.image.trim() === '') {
                book.image = "default-image-url.jpg"; // replace with your default image URL
            }
            if (!book.publisher || book.publisher.trim() === '') {
                book.publisher = "Unknown Publisher";
            }
            if (!book.publishedDate || book.publishedDate.trim() === '') {
                book.publishedDate = "Unknown Date";
            }
            if (!book.isbn || book.isbn.trim() === '') {
                book.isbn = "Unknown ISBN";
            }
            res.render("description.ejs", { book });
        } else {
            res.status(404).send("Book not found");
        }
    } catch (error) {
        res.status(500).send("Error retrieving book");
    }
});



















//-------------------------------------------------Displaying all books-----------------------------------------------------------------------------








// Example route that requires a complete profile
app.get("/BookBytes/book",  async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const booksPerPage = 9;
        const skip = (page - 1) * booksPerPage;

        const books = await Book.find().skip(skip).limit(booksPerPage);
        const totalBooks = await Book.countDocuments();
        const user = req.user;
        const defaultlink = "https://media.istockphoto.com/id/1292243589/vector/book-vector-icon-isolated-closed-book-notebook-with-blue-cover-flat-colored-illustration.jpg?s=612x612&w=0&k=20&c=SWBWdjhpk2EGPHPGD37dgEOZpScN4SSnUDMvBT7_hhs=";
        
        res.render("books.ejs", {
            books,
            user,
            defaultlink,
            currentPage: page,
            totalPages: Math.ceil(totalBooks / booksPerPage)
        });
    } catch (error) {
        console.error("Error fetching books:", error);
        res.status(500).send("Error fetching books");
    }
});




// creating new book 
app.get("/BookBytes/book/new",isLoggedIn,(req, res) => {
    const user = req.user;
    res.render("new.ejs", {user: user});
});
app.post("/BookBytes/book/new", async (req, res) => {
    const { title, author, publishYear, type, bookImg } = req.body;

    try {
        const newBook = new Book({
            title,
            author,
            publishYear,
            type,
            bookImg,
        });

        await newBook.save();
        res.redirect('/BookBytes/book');
    } catch (error) {
        res.render('addBook', { messages: { error: 'Failed to add book. Please try again.' } });
    }
});






































































































// ----------------------------------------------------Unused---------------------------------------------------------------------------











// Delete route
app.delete("/BookBytes/book/:id",async(req,res)=>{
    try{
    let {id} = req.params;
    let book = await Book.findByIdAndDelete(id);
    res.redirect("/BookBytes/book");
    }
    catch(err){
        console.error("Error deleteing books:", error);
        res.status(500).send("Error fetching books");
    }
})
// Edit Route
app.get("/BookBytes/book/:id/edit", async (req, res) => {
    try {
        let { id } = req.params;
        let book = await Book.findById(id);
        res.render("edit", { book });
    } catch (err) {
        console.error("Error finding book:", err);
        res.status(500).send("Error fetching book for editing");
    }
});
app.put("/BookBytes/book/:id/edit", async (req, res) => {
    try {
        let { id } = req.params;
        let { title, publishYear, type, author } = req.body;
        let book = await Book.findByIdAndUpdate(id, {
            title: title,
            publishYear: publishYear,
            type: type,
            author: author
        }, { runValidators: true, new: true });
        res.redirect("/BookBytes/book");
    } catch (err) {
        console.error("Error updating book:", err);
        res.status(500).send("Error updating book");
    }
});



























































































































// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
