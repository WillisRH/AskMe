const express = require('express');
const app = express()

port = 8971;

const bodyParser = require('body-parser');
const uuid = require('uuid');





// Express Connection
app.listen(process.env.PORT || port, () => {
    console.log("Servernya nyala. Port -> " + port)
    console.log('Waiting for AuthAPI hook!');
});



async function checkAuthServer() {
  try {
    const response = await fetch('http://localhost:3000/status', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    })
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
app.use(bodyParser.urlencoded({ extended: true }));
app.post('/submit', async (req, res) => {
  const question = req.body.question;


    try {
      const response = await fetch('http://localhost:3000/submit', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ question: question })
      });
      const data = await response.json();
      if(data.error) {
          console.error(data.error);
          res.redirect('/home/askme/success=false');
      } else {
          console.log(data.message);
          res.redirect('/home/askme/success=true');
      }
  } catch(error) {
      console.error(error);
      res.render('askme.ejs', { error: 'The server is currently down/under maintenance!' });
  }

    
  });

// Redirection
app.get('/', (req, res) => {
    res.redirect("/home")
})

app.get('/home', (req, res) => {
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
            body: JSON.stringify({ email: email, password: password })
        });
        if (response.status == "400") {
          res.render('signuphandler.ejs', { error: 'User is already Exist!' });
          return console.log('The Username is already Exist! Please try again! (400)')
        }
        if (!response.ok) {
            throw new Error(response.statusText, "\n Error");
        } 
        console.log('Success logged in with username \'' + email + "\'\nRedirecting to admin page! (200)")
        res.redirect('/home/askme/admin/login');

} catch (e) {
  res.render('signuphandler.ejs', { error: 'The server is currently down/under maintenance!' });
  console.log(e);
}
})

function setTokenWithExpiration(expiresIn) {
  setTimeout(() => {
      console.log('Token has expired!');
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


      setTokenWithExpiration(12000);
    
    } catch (error) {
      res.render('loginhandler.ejs', { error: 'The server is currently down/under maintenance!' });
    }
});




app.get('/home/askme/admin', async (req, res) => {
  // if (localStorage.getItem('token') == null || localStorage.getItem('token') == undefined || localStorage.getItem('token') == '') return res.redirect('/home/askme/admin/login')

  

  try {
    const response = await fetch('http://localhost:3000/questionslist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const questions = await response.json();
    res.render('adminaskme.ejs', {questions: questions})
    console.log('Successfully grabbing the questions list! (200)')
    // ...
  } catch (error) {
    res.render('adminaskme.ejs', { error: 'The server is currently down/under maintenance!' });
  }
})




app.get('/home/askme/admin/questions/:id', async (req, res) => {
    // Get the ID of the question from the request parameters
    // if (localStorage.getItem('token') == null || localStorage.getItem('token') == undefined || localStorage.getItem('token') == '') return res.redirect('/home/askme/admin/login')
    const id = req.params.id;
  try {
    const response = await fetch('http://localhost:3000/questions/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    res.render('questionsinterface.ejs', { questions: data });
  } catch (error) {
    console.error(error);
    res.render('adminaskme.ejs', { error: 'The server is currently down/under maintenance!' });
  }
  
  });
  

  app.get('/home/askme/admin/questions/:id/delete', async (req, res) => {
    // if (localStorage.getItem('token') == null || localStorage.getItem('token') == undefined || localStorage.getItem('token') == '') return res.redirect('/home/askme/admin/login')
    const id = req.params.id;

    try {
      const response = await fetch('http://localhost:3000/questions/' + id + "/delete", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log(`Activity | Deleted (${id})`);
        res.redirect("/home/askme/admin")
    } catch (error) {
      console.error(error);
      res.render('adminaskme.ejs', { error: 'The server is currently down/under maintenance!' });
    }
});
