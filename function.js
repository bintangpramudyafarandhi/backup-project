const express = require('express')
const app = express();
const port = 3000
const expressEjsLayouts = require('express-ejs-layouts')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcrypt')
const saltRounds = 10
const pool = require('./dbConfig')

const savedata = async (name,email,password) => {
    const save = await pool.query(`INSERT INTO public."user"("Name", "Email", "Password") VALUES ('${name}', '${email}', '${password}');`)
}

async function loadContact() {
    try {
        const { rows: users } = await pool.query(`SELECT * FROM public."user" ORDER BY "Name" ASC;`);
        return users;
    } catch (error) {
        console.error('Load contact error')
    }
}

async function findEmail(email) {
    const {rows} = await pool.query(`SELECT "Email" WHERE "Email" = '${email}'`)
    return rows
}

async function findID(id) {
    return await pool.query(`SELECT "ID" WHERE "ID" = '${id}'`)
}

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next();
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login')
}

const authenticateRole = async (data) => {
    try {
        const { rows: user } = await pool.query(`SELECT role FROM public.user WHERE Email = '${data}'`)
        const { rows: admin } = await pool.query(`SELECT role FROM public.admin where Email = '${data}'`)
        if (user.length > 0 && admin.length <= 0) {
            console.log(user);
            return user[0].role;
            // req.session.role = user[0].role;
        } else if (admin.length > 0 && admin[0].role == "admin") {
            console.log(admin[0].role);
            return admin[0].role;
        } else if (admin[0].role == "superadmin") {
            return admin[0].role;
        } else {
            console.log('error kocak')
        }
    } catch (error) {
        console.log("authrole error", error);
    }
}


const isAdmin = (req, res, next) => {
    if (req.session.role == "admin") {
      next();
    } else {
      res.redirect('/')
    }
  };
  
const isSuperadmin = (req, res, next) => {
    if (req.session.role == "superadmin") {
      next();
    } else {
      res.redirect('/')
    }
};
  
const isUser = (req, res, next) => {
    if (req.session.role == "user") {
      next();
    } else {
      res.redirect('/admin')
    }
};

module.exports = {savedata, loadContact, findEmail, findID, checkAuthenticated, checkNotAuthenticated, isAdmin, isSuperadmin, isUser}