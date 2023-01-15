const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const app = express();

const crypto = require('crypto');






exports.handleLogin = function(username, password, connection, res) {
    // Check if the username and password match a record in the database
    const sql = 'SELECT COUNT(*) as count FROM users WHERE username = ? AND password = ?';
    connection.query(sql, [username, password], function (error, results, fields) {
      if (error) throw error;
  
      // If the username and password match a record in the database, redirect to /home
      if (results[0].count > 0) {
        res.redirect('/home/askme/admin');
      } else {
        // If the username and password are incorrect, redirect to /home/askme/admin/login?att=false
        res.render('loginhandler.ejs', { error: 'Your password or username is incorrect. Please try again!' });

      }
    });
  }

  
