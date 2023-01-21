const express = require('express');
const app = express()
const loginHandler = require('./loginhandler');
const pageHandler = require('./pagehandler');
const session = require('express-session');

port = 8971;

const bodyParser = require('body-parser');
const uuid = require('uuid');
// Database Thing
const mysql = require('mysql');
const { setName } = require('./pagehandler');

const connection = mysql.createConnection({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'userdata',
  charset: 'utf8mb4'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database: ' + err.stack);
    return;
  }
  console.log('Connected to the database as id ' + connection.threadId);
});

const checkTableSql = 'SHOW TABLES LIKE ?';
const createTableSql = `CREATE TABLE question (
  id INT(11) AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) NOT NULL
)`;

const sqlusers = `CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  loggedin BOOLEAN DEFAULT FALSE
)`;


connection.query(sqlusers, ['users'], function (error, results, fields) {
  if (error) throw error;
  if (results.length === 0) {
    connection.query(createTableSql, function (error, results, fields) {
      if (error) throw error;
      console.log('Table created (users)');
    });
  } else {
    console.log('Table already exists (users)');
  }
});

connection.query(checkTableSql, ['question'], function (error, results, fields) {
  if (error) throw error;
  if (results.length === 0) {
    connection.query(createTableSql, function (error, results, fields) {
      if (error) throw error;
      console.log('Table created (question)');
    });
  } else {
    console.log('Table already exists (question)');
  }
});

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }
  
  function generateUniqueId(connection) {
    return new Promise((resolve, reject) => {
      let randomInt = getRandomInt(99999) + 10000;
      let randomIntString = randomInt.toString().padStart(5, '0');
  
      // Query the database to see if the id already exists
      const sql = 'SELECT COUNT(*) as count FROM question WHERE id = ?';
      connection.query(sql, [randomIntString], function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          // If the id already exists, generate a new random id
          if (results[0].count > 0) {
            resolve(generateUniqueId(connection));
          } else {
            // If the id is unique, return it
            resolve(randomIntString);
          }
        }
      });
    });
  }

app.use(bodyParser.urlencoded({ extended: true }));
const id = uuid.v4();
app.post('/submit', function (req, res) {
    generateUniqueId(connection).then((id2) => {
        const question = req.body.question;
        // const idres = id;
        const sql = 'INSERT INTO question (id,question) VALUES (?, ?)';
        connection.query(sql, [id2, question], function (error, results, fields) {
          
            if (error) {
                console.log("|-------------------------|")
                console.error(error);
                console.log("|-------------------------|")
                res.redirect('/home/askme/success=false');  // Redirect to the error page
              } else {
                console.log("|-------------------------|")
                console.log('A new record inserted!');
                console.log('ID: ' + id2);
                console.log('A new Question appeared: \"' + question + "\"")
                console.log("|-------------------------|")
                console.log("")
                console.log("")
                res.redirect('/home/askme/success=true');  // Redirect to the success page
              } 
        });

        
    })

    
  });



// formElement.addEventListener('submit', function (event) {
//   event.preventDefault();
//   const question = document.getElementById('question').value;
//   const id = uuid();
//   const sql = `INSERT INTO question (id, question) VALUES (?, ?)`;
//   connection.query(sql, [id, question], function (error, results, fields) {
//     if (error) throw error;
//     console.log('Record inserted');
//   });
// });

// Express Connection
app.listen(process.env.PORT || port, () => {
  
    console.log("Servernya nyala. Port -> " + port)
});

async function checkAuthServer() {
  try {
    const response = await fetch('http://localhost:3000/status');
    if (response.status === 200) {
      console.log('\x1b[32m' + '[AuthAPI] Authentication server is running.' + '\x1b[37m');
    } else {
      console.log('\x1b[31m' + '[AuthAPI] Authentication server is not running.'+ '\x1b[37m');
    }
  } catch (error) {
    console.log('\x1b[31m' + '[AuthAPI] Authentication server is not running.' + '\x1b[37m');
  }
}

checkAuthServer();

app.use(express.static('public'));
app.set('view engine', 'ejs');


// Redirection
app.get('/', (req, res) => {
    res.redirect("/home")
})

app.get('/home', (req, res) => {
    // res.sendfile("public/index.html");
    res.render('mainpage.ejs')
}) 

app.get('/contact', (req, res) => {
    res.render('contact.ejs')
})

app.get('/home/askme', (req, res) => {
    res.render("askme.ejs")
})

app.get('/home/askme/success=true', (req, res) => {
    res.render("successask.ejs")
    // pageHandler.setName('cecep')
})

app.get('/home/askme/success=false', (req, res) => {
    res.render("failask.ejs")
})


app.get("/home/askme/admin/signup", (req,res) => {
  res.render('signuphandler.ejs')
})

app.post("/home/askme/admin/signupatt", async (req,res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(response.statusText, "\n Error");
    } 
    res.redirect('/home/askme/admin/')
} catch (e) {
    // Handle network error
}
})

function setTokenWithExpiration(expiresIn) {
  setTimeout(() => {
      console.log('Token has expired!');
      // res.render('loginhandler.ejs', { error: 'Your token has expired! Please login again!' })
      localStorage.removeItem('token');
  }, expiresIn);
}

app.get("/home/askme/admin/login", (req, res) => {
  res.render("loginhandler.ejs")

})

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}

app.post('/home/askme/admin/loginatt', async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  
    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password: password })
        });
        if (response.status == "400") {
          res.render('loginhandler.ejs', { error: 'Your password or username is incorrect. Please try again!' });
          return console.log('The username or id is invalid! Please try again! (400)')
        }
        if (!response.ok) {
            throw new Error(response.statusText, "\n Error");
        } 
        const json = await response.json();
        console.log(json);
        console.log('Success logged in with username \'' + username + "\'\nRedirecting to admin page! (200)")
        res.redirect('/home/askme/admin');
        
    
        if(json.token) localStorage.setItem('token', json.token);


      setTokenWithExpiration(120000);
    
    } catch (error) {
        console.log(error);
    }
  // loginHandler.handleLogin(username, password, connection, res);
});


// app.get('/home/askme/admin/loginatt=false', (req, res) => {
//   res.redirect("/home/askme/admin/login");
// })

const auth = require('./loginhandler');
const { Cookie } = require('express-session');



app.get('/home/askme/admin', (req, res) => {
  if (localStorage.getItem('token') == null || localStorage.getItem('token') == undefined || localStorage.getItem('token') == '') return res.redirect('/home/askme/admin/login')
  const sql = 'SELECT id, question FROM question';
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;
    res.render('adminaskme.ejs', { questions: results });
  });
  
})


app.get('/home/askme/admin/questions/:id', (req, res) => {
    // Get the ID of the question from the request parameters
    if (localStorage.getItem('token') == null || localStorage.getItem('token') == undefined || localStorage.getItem('token') == '') return res.redirect('/home/askme/admin/login')
    const id = req.params.id;
  
    const query = `SELECT * FROM question WHERE id = ${id}`
  connection.query(query, function (error, results, fields) {
    if (error) throw error;
    res.render('questionsinterface.ejs', { questions: results[0] });
  });
  
  
  });
  

  app.get('/home/askme/admin/questions/:id/delete', (req, res) => {
    if (localStorage.getItem('token') == null || localStorage.getItem('token') == undefined || localStorage.getItem('token') == '') return res.redirect('/home/askme/admin/login')
    const questionId = req.params.id;
    const question = req.params.question;
    const query = `DELETE FROM question WHERE id = ${questionId}`;
    connection.query(query, (err, result) => {
        if (err) throw err;
        const question = result[0];
        console.log(`Activity | Deleted ${result.affectedRows} rows (${questionId})`);
        res.redirect("/home/askme/admin")
    });
});

  
// Discord Integrated!!!!!

  
// const { Client, GatewayIntentBits } = require('discord.js');
// const client = new Client({ intents: [ 
//   GatewayIntentBits.DirectMessages,
//   GatewayIntentBits.Guilds,
//   GatewayIntentBits.GuildBans,
//   GatewayIntentBits.GuildMessages,
//   GatewayIntentBits.MessageContent,] });

// client.on('ready', () => {
//   console.log(`Logged in as ${client.user.tag}!`);
//   client.user.setPresence({ activities: [{ name: 'AskMe Discord Interface' }], status: 'dnd', type: 'PLAYING'});
// });

// const token = 'OTM1MTQxNjkxMjI3Mjc1Mjg1.G-KojV.PlOMNIIe1F2QVt84C6IH4apV0eZzPUzjdS7srg';


// client.on('messageCreate', (message) => {
//   if (message.content=== "!showallquestions") {
//     connection.query("SELECT * FROM question", (err, result, fields) => {
//       if (err) {
//         message.reply('An error occurred while trying to retrieve the questions from the database \n');
//       } else {
//         message.channel.send(`Mengambil data dari database...`)
//         let questions = result.map((row, index) =>`Question ${index+1}: ${row.question} (${row.id})`).join('\n');
//           message.channel.send(questions);
//       }
//     });
//   } else if (message.content === '!mysqlinfo') {
//     message.channel.send(`The IP of the MySQL server is ${connection.config.host} and the port is ${connection.config.port}.`);
//   } else if (message.content === '!mysqlping') {
//     connection.ping((err) => {
//       if(err) {
//         message.reply(`An error occurred while trying to ping the MySQL server: ${err}`);
//       } else {
//         message.reply('MySQL server is reachable!');
//       }
//     });
//   } else if (message.content === '!help') {
//     message.reply('Command List: \n !mysqlinfo \n!mysqlping \n!showallquestions')
//   }
// });



// client.login(token);
