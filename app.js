const express = require('express')
const app = express()
const { pool } = require('./dbConfig')
const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')
const passport = require('passport')
const expressEjsLayouts = require('express-ejs-layouts')
const call = require('./function')
const path = require('path')


const initializePassport = require('./passportConfig')
const { authenticate } = require('passport')

initializePassport(passport)

const PORT = process.env.PORT || 3000

app.set('view engine','ejs')
app.use(express.urlencoded({ extended: false }))
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())
app.use(expressEjsLayouts)
app.use(express.static(path.join(__dirname,'public')))

app.get('/', call.checkNotAuthenticated, (req, res) => {
    res.render('index', { 
        user: req.user.name,
        title: "Attendance App",
        layout: "template/main" 
    })
})

app.get('/register', call.checkAuthenticated, (req, res) => {
    res.render('register', {
        layout: "template/main",
        title: "Add New Employee"
    })
})

app.post('/register', async (req, res) => {
    let { name, email, password } = req.body 

    console.log({
        name,
        email,
        password,
    });

    let errors = []

    if (!name || !email || !password) {
        errors.push({ message: 'Please fill out all fields' })
    }

    if (password.length < 6) {
        errors.push({ message: 'Password should contain atleast 6 characters'})
    }

    if (errors.length > 0) {
        res.render('register', {
            errors,
            layout: "template/main",
            title: "Add New Employee"
        })
    }else{
        req.body.role = 'admin'
        let hashedPassword = await bcrypt.hash(password, 10)
        console.log(hashedPassword);

        pool.query(
            `SELECT * FROM users
            WHERE email = $1`, [email], 
            (err, results) =>{
                if (err){
                    throw err
                }
                console.log(results.rows);

                if (results.rows.length > 0) {
                    errors.push({ message: 'Email already registered'})
                    res.render('register', {
                        errors,
                        layout: "template/main",
                        title: "Add New Employee"
                    })
                }else{
                    pool.query(
                        `INSERT INTO admin (name, email, password, role)
                        VALUES ($1, $2, $3, $4)`, 
                        [name, email, hashedPassword, req.body.role], 
                        (err, results) => {
                            if (err){
                                throw err
                            }
                            console.log(results.rows);
                            req.flash('success_msg', 'You are now registered, please log in')
                            res.redirect('/login')
                        }
                    )
                }
            }
        )
    }
})

app.get('/login', call.checkAuthenticated, (req, res) => {
    res.render('login', {
        layout: "login",
        title: "Login"
    })
})

// app.post('/login',async(req,res)=>{
//     const tstst = call.findEmail(req.body.email)
//     req.session.role = tsts[0].role
//     if(successRedirect){
//         res.redirect('/')
//     }else{
//         res.redirect('/login')
//     }
// })

app.post('/login', passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    })
)

app.get('/user',call.isUser,(req,res)=>{
    res.send('ini user')
})

app.get('/admin',call.isAdmin, (req,res)=>{
    res.send("ini admin")
})

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
        if (err) {return next(err)}
        req.flash('success_msg', 'You have logged out')
        res.redirect('/login')
    })
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})