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

app.get('/login', call.checkAuthenticated, (req, res) => {
    res.render('login', {
        layout: "login",
        title: "Login"
    })
})

app.post("/login", async (req, res) => {
    const pw = await call.matchPassword(req.body.email);
    console.log(pw);
    if (pw.length > 0) {
      const isMatch = await bcrypt.compare(req.body.password, pw[0].password);
  
      if (!isMatch) {
        console.log("password salah");
        res.redirect("login");
      } else {
        const role = await call.authenticateRole(req.body.email);
        console.log(role);
        req.session.isAuth = true;
        req.session.role = role;
        if (role == "superadmin") {
          return res.redirect("/superadmin");
        }
        else if (role == "admin") {
          return res.redirect("/admin");
        } else if(role == "user") {
          return res.redirect("/user");
        }else{
          res.send('error')
        }
      }
    } else {
      console.log("username salah");
      res.redirect("login");
    }
});

// app.post('/login', passport.authenticate('local'), async(req,res) => {
//     const {rows:findUser} = await pool.query(`SELECT role FROM users WHERE role = 'user';`)
//     const {rows:findAdmin} = await pool.query(`SELECT role FROM public.admin WHERE role = 'admin';`)

//     if (findUser.length > 0) {
//         res.redirect('/user')
//     } else if (findAdmin.length > 0) {
//         res.redirect('/admin')
//     }
// })

// app.post('/login', passport.authenticate('local', {
//         successRedirect: '/',
//         failureRedirect: '/login',
//         failureFlash: true
//     })
// )

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
        if (err) {return next(err)}
        req.flash('success_msg', 'You have logged out')
        res.redirect('/login')
    })
})

app.get('/user', (req,res) => {
    res.send('ini user')
})

app.get('/admin', (req, res) => {
    res.render('admin/index.ejs', {
        layout: "template/admin-sidebar",
        title: "Admin Dashboard"
    })
})

app.get('/admin/employee-list', async (req, res) => {
    const employee = await call.loadEmployee()
    res.render('admin/employee-list', {
        layout: "template/admin-sidebar",
        title: "Employee List",
        employee
    })
})

app.get('/admin/employee-list/add-employee', call.checkAuthenticated, (req, res) => {
    res.render('admin/add-employee', {
        layout: "template/admin-sidebar",
        title: "Add New Employee"
    })
})

app.post('/admin/employee-list/add-employee', async (req, res) => {
    let { name, email, mobile, password } = req.body 

    console.log({
        name,
        email,
        mobile,
        password,
    });

    let errors = []

    if (!name || !email || !mobile || !password) {
        errors.push({ message: 'Please fill out all fields' })
    }

    if (password.length < 6) {
        errors.push({ message: 'Password should contain atleast 6 characters'})
    }

    if (errors.length > 0) {
        res.render('admin/add-employee', {
            errors,
            layout: "template/admin-sidebar",
            title: "Add New Employee"
        })
    }else{
        req.body.role = 'user'
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
                    res.render('admin/add-employee', {
                        errors,
                        layout: "template/admin-sidebar",
                        title: "Add New Employee"
                    })
                } else {
                    pool.query(
                        `INSERT INTO users (name, email, mobile, password, role)
                        VALUES ($1, $2, $3, $4, $5)`, 
                        [name, email, mobile, hashedPassword, req.body.role], 
                        (err, results) => {
                            if (err){
                                throw err
                            }
                            console.log(results.rows);
                            req.flash('success_msg', 'You are now registered, please log in')
                            res.redirect('/admin/employee-list')
                        }
                    )
                }
            }
        )
    }
})

app.get('/admin/employee-list/:id', async (req, res) => {
    const getDetail = await call.detail(req.params.id)
    const params = req.params.id
    res.render('admin/employee-detail', {
        layout: "template/admin-sidebar",
        title: "Employee Detail",
        getDetail,
        params
    })
})

app.get("/admin/employee-list/edit/:name", async (req,res) => {
    const getDetail = await call.detail(req.params.name)
    const params = req.params.name
    res.render('admin/employee-edit', {
      params,
      layout: "template/admin-sidebar",
      title: "Edit Employee",
      getDetail: getDetail[0],
    })
})

app.post("/admin/employee-list/edit/:name", async (req, res) => {
    let where = req.params.name
    let name = req.body.name
    let email = req.body.email
    let mobile = req.body.mobile
       
    await pool.query(`UPDATE users SET "name"='${name}',"email"='${email}',"mobile"='${mobile}' WHERE "name" = '${where}'`)
    res.redirect("/admin/employee-list")
})

app.get('/admin/employee-list/delete/:name', (req, res) => {
    console.log(req.params.name);
    const contact = call.postgredelete(req.params.name)
    res.redirect('/admin/employee-list')
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})