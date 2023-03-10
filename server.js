const express = require("express");
const app = express();
const expressLayout = require("express-ejs-layouts");
require("dotenv").config();

port = 8971;

const bodyParser = require("body-parser");
const uuid = require("uuid");
var mt = false;

// Express Connection
app.listen(process.env.PORT || port, () => {
	console.log(`
|--------------------------------------------------------|
    _   ___ _  ____  __ ___ 
   /_\ / __| |/ /  \\/   | __|
  / _ \\\\__ \\ ' <| |\\/| | _| 
 /_/ \\_\\___/_|\\_\\_|  |_|___| 
                            V.1.1.1
`);
	console.log("Servernya nyala. Port -> " + port);
	console.log("Waiting for AuthAPI hook!");
	console.log("|--------------------------------------------------------|");
});

async function checkAuthServer() {
	const now = new Date();
	const hours = now.getHours().toString().padStart(2, "0");
	const minutes = now.getMinutes().toString().padStart(2, "0");
	const seconds = now.getSeconds().toString().padStart(2, "0");

	try {
		const response = await fetch(process.env.AUTHAPI + "status", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
		});
		if (response.status === 200) {
			console.log(
				"\x1b[32m" +
					`[${hours}:${minutes}:${seconds}] [AuthAPI] Authentication server is running.` +
					"\x1b[37m"
			);
			mt = false;
		} else {
			console.log(
				"\x1b[31m" +
					`[${hours}:${minutes}:${seconds}] [AuthAPI] Authentication server is not running.` +
					"\x1b[37m"
			);
			mt = true;
		}
	} catch (error) {
		console.log(
			"\x1b[31m" +
				`[${hours}:${minutes}:${seconds}] [AuthAPI] Authentication server is not running.` +
				"\x1b[37m"
		);
		mt = true;
	}
}

if (!app.locals.title) {
	app.locals.title = "Default Title";
}

if (mt) {
	app.locals.error =
		"Server is currently down or maintenance, please wait or contact an admin!";
}

checkAuthServer();

setInterval(checkAuthServer, 30000);

app.use(express.static("public"));
app.use(expressLayout);
app.set("layout", "layouts/mainlayout");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const Cookies = require("cookies");

const beforeLoad = (req, res, next) => {
	let cookie = new Cookies(req, res);
	if (cookie.get("token")) {
		if (cookie.get("username")) {
			app.locals.username = cookie.get("username");
			next();
		}
	} else {
		app.locals.username = false;
		next();
	}
};

app.get("/home/askme/:id/success", beforeLoad, async (req, res) => {
	const id = req.params.id;

	try {
		const response = await fetch(
			process.env.AUTHAPI + `getusernamebyquestionid/${id}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			}
		);

		const name = await response.json();

		res.render("successask.ejs", { username: name, id: id });
	} catch (err) {}
});

app.get("/home/askme/:id/failed", beforeLoad, (req, res) => {
	const id = req.params.id;
	res.render("failask.ejs", { id: id });
});

app.get("/home/askme/", beforeLoad, (req, res) => {
	res.redirect("/home/askme/admin/login"); // sementara ke loginpage
});

app.post("/submit/:id", async (req, res) => {
	const question = req.body.question;
	const questionid = req.params.id;

	try {
		const response = await fetch(process.env.AUTHAPI + "submit", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ question: question, id: questionid }),
		});
		const data = await response.json();
		if (data.error) {
			console.error("[URGENT] " + data.error + `(${questionid})`);
			res.redirect(`/home/askme/${questionid}/failed`);
		} else {
			// console.log(data.message); gatau buat apa
			res.redirect(`/home/askme/${questionid}/success`);
		}
	} catch (error) {
		console.error(error);
		res.render("askme.ejs", {
			error: "The server is currently down/under maintenance!",
		});
	}
});

// Redirection
app.get("/", beforeLoad, (req, res) => {
	res.redirect("/home");
});

app.get("/home", beforeLoad, (req, res) => {
	let cookie = new Cookies(req, res);
	let token = cookie.get("token");
	let username = cookie.get("username");
	if (token) {
		app.locals.loggedin = true;
		app.locals.username = username;
	} else {
		app.locals.loggedin = false;
	}
	res.render("mainpage.ejs");
});

app.get("/contact", beforeLoad, (req, res) => {
	res.render("contact.ejs");
});

app.get("/home/askme/:id", beforeLoad, async (req, res) => {
	const id = req.params.id;
	let cookies = new Cookies(req, res);
	let token = cookies.get("token");
	if (id.includes("admin")) {
		if (!token) {
			return res.render("loginhandler.ejs");
		}
		return res.redirect(`/home/askme/admin/${token}/profile`);
	}

	if (isNaN(id)) {
		if (!mt) {
			return res.render("askme.ejs", {
				title: "Invalid ID :(",
				id: id,
				error: "The id is not a number!",
			});
		}
	}

	try {
		const response = await fetch(
			process.env.AUTHAPI + `getquestiontitle/${id}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
			}
		);
		const title = await response.json();

		// if(title.error) {
		//   return res.redirect(`/home`)
		// }

		res.render("askme.ejs", {
			id: id,
			title: title.questiontitle,
			error: title.error,
		});
	} catch (err) {
		res.render("askme.ejs", {
			title: "Aww Snap :(",
			id: id,
			error: "Server offline please try again later!",
		});
	}
});

app.get("/home/askme/admin/signup", beforeLoad, (req, res) => {
	res.render("signuphandler.ejs");
});

app.post("/home/askme/admin/signupatt", async (req, res) => {
	const email = req.body.email;
	const username = req.body.username;
	const password = req.body.password;

	try {
		const response = await fetch(process.env.AUTHAPI + "register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: email,
				password: password,
				username: username,
			}),
		});
		if (response.status == "400") {
			res.render("signuphandler.ejs", { error: "User is already Exist!" });
			return; //console.log('The Username is already Exist! Please try again! (400)')
		}
		if (!response.ok) {
			throw new Error(response.statusText, "\n Error");
		}
		// console.log('Success logged in with username \'' + email + "\'\nRedirecting to admin page! (200)")
		res.redirect("/home/askme/admin/login");
	} catch (e) {
		res.render("signuphandler.ejs", {
			error: "The server is currently down/under maintenance!",
		});
	}
});

function setTokenWithExpiration(expiresIn) {
	setTimeout(() => {
		console.log("Token has expired!");
		localStorage.removeItem("token");
	}, expiresIn);
}

app.get("/home/askme/admin/login", beforeLoad, (req, res) => {
	let cookies = new Cookies(req, res);
	let token = cookies.get("token");
	let email = cookies.get("email");

	if (token && email != null) {
		return res.redirect("/home/askme/admin?" + token);
	}
	res.render("loginhandler.ejs");
});

if (typeof localStorage === "undefined" || localStorage === null) {
	var LocalStorage = require("node-localstorage").LocalStorage;
	localStorage = new LocalStorage("./scratch");
}

app.post("/home/askme/admin/loginatt", async (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;

	try {
		const response = await fetch(process.env.AUTHAPI + "login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: email, password: password }),
		});
		if (response.status == "400") {
			res.render("loginhandler.ejs", {
				error: "Your password or email is incorrect. Please try again!",
			});
			return; //console.log('The username or id is invalid! Please try again! (400)')
		}
		if (!response.ok) {
			throw new Error(response.statusText, "\n Error");
		}
		const json = await response.json();
		let expires = new Date();
		expires.setSeconds(expires.getSeconds() + 120);
		let cookies = new Cookies(req, res);
		cookies.set("token", json.token, { expires: expires });
		cookies.set("email", json.email, { expires: expires });
		cookies.set("username", json.username, { expires: expires });
		cookies.set("id", json.id, { expires: expires });
		// console.log('Success logged in with username \'' + username + "\'\nRedirecting to admin page! (200)")
		res.redirect("/home/askme/admin/" + json.token + "/profile");
		// console.log(json.token)

		// if(json.token) localStorage.setItem('token', json.token);

		// setTokenWithExpiration(50000);
	} catch (error) {
		res.render("loginhandler.ejs", {
			error: "The server is currently down/under maintenance!",
			hideButton: true,
		});
	}
});

// const fetchEmail = async (token) => {
//   const response = await fetch(process.env.AUTHAPI + 'profile', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({ token })
//   });

//   const data = await response.json();
//   if (data.hasOwnProperty('error')) {
//     throw new Error(data.error);
//   }
//   return data.email;
// };

// const profileData = async () => {
//   try {
//     const response = await fetch(process.env.AUTHAPI + 'profile', {
//       credentials: 'include'
//     });
//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error(error);
//     return error;
//   }
// }

app.get("/home/askme/admin/:id", beforeLoad, async (req, res) => {
	let cookies = new Cookies(req, res);
	let token = cookies.get("token");
	let email = cookies.get("email");
	let username = cookies.get("username");
	if (!token) {
		return res.redirect("/home/askme/admin/login");
	}

	// if (req.query.id == null && req.query.email == null &&token) {
	//   return res.redirect(`/home/askme/admin?${token}/${email}`);
	// }
	// try {
	//       fetchEmail(token).then((email) => {
	//   console.log(email);
	// });
	// } catch (error){
	//   console.log(error)
	// }

	try {
		const response = await fetch(process.env.AUTHAPI + "questionslist", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: req.params.id }),
		});
		const response1 = await fetch(
			process.env.AUTHAPI + `getquestiontitle/${req.params.id}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
			}
		);

		const title = await response1.json();

		const questions = await response.json();

		res.render("adminaskme.ejs", {
			questions: questions,
			username: username,
			token: token,
			id: req.params.id,
			title: title.questiontitle,
		});
		// console.log('Successfully grabbing the questions list! (200)')
	} catch (error) {
		res.render("adminaskme.ejs", {
			error: "The server is currently down/under maintenance!",
		});
	}
});

app.get("/home/askme/admin/:id/profile", beforeLoad, async (req, res) => {
	let cookies = new Cookies(req, res);
	let token = cookies.get("token");
	let email = cookies.get("email");
	let username = cookies.get("username");
	let id = cookies.get("id");
	if (!token) {
		// return res.redirect('/home/askme/admin/login')
		return res.render("loginhandler.ejs", {
			error: "Your session has been expired!",
		});
	}

	try {
		const response = await fetch(
			process.env.AUTHAPI + "questionsprofilelist/" + id,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
			}
		);
		const questions = await response.json();
		//  console.log(questions)
		const response2 = await fetch(process.env.AUTHAPI + "specialuserlist", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});
		const responseText2 = await response2.json();
		const specialUserIds = responseText2.map((id) => id.toString());

		res.render("profile.ejs", {
			email: email,
			username: username,
			token: token,
			id: id,
			questions: questions,
			special: specialUserIds,
		});

		// console.log('Successfully grabbing the questionsprofile list! (200)')
	} catch (error) {
		// res.render('adminaskme.ejs', { error: 'The server is currently down/under maintenance!' });
		res.redirect("/home/askme/admin/login");
		// console.log(error)
	}
});

app.get(
	"/home/askme/admin/:id/profile/createquestions",
	beforeLoad,

	async (req, res) => {
		let cookies = new Cookies(req, res);
		let token = cookies.get("token");
		let email = cookies.get("email");
		let username = cookies.get("username");
		let id = cookies.get("id");
		if (!token) {
			// return res.redirect('/home/askme/admin/login')
			return res.render("loginhandler.ejs", {
				error: "Your session has been expired!",
			});
		}
		try {
			const response = await fetch(
				process.env.AUTHAPI + "questionsprofilelist/" + id,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}
			);
			const questions = await response.json();

			const response2 = await fetch(process.env.AUTHAPI + "specialuserlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const responseText2 = await response2.json();
			const specialUserIds = responseText2.map((id) => id.toString());

			res.render("createquestion.ejs", {
				token: token,
				questions: questions,
				id: id,
				special: specialUserIds,
			});
			// console.log('Successfully grabbing the questionsprofile list! (200)')
		} catch (err) {
			res.render("profile.ejs", {
				error: "The server is currently down/under maintenance!",
			});
		}

		// res.render('createquestion.ejs', {token: token})
	}
);

app.post(
	"/home/askme/admin/:id/profile/creatingquestionsession",
	async (req, res) => {
		let cookies = new Cookies(req, res);
		let token = cookies.get("token");

		if (!token) {
			// return res.redirect('/home/askme/admin/login')
			return res.render("loginhandler.ejs", {
				error: "Your session has been expired!",
			});
		}

		let email = cookies.get("email");
		let username = cookies.get("username");
		let id = cookies.get("id");
		const question = req.body.question;

		try {
			const response2 = await fetch(process.env.AUTHAPI + "specialuserlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userid: id, question: question }),
			});
			const responseText2 = await response2.json();

			const specialUserIds = responseText2.map((id) => id.toString());

			const response1 = await fetch(
				process.env.AUTHAPI + "questionsprofilelist/" + id,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}
			);
			const questions = await response1.json();
			if (questions.length > 2 && !specialUserIds.includes(id.toString())) {
				console.log(
					"Someone is attempting to make a new session, but it's limited!"
				);
				res.redirect("/home/askme/admin/" + token + "/profile/createquestions");
				return;
			}

			const response = await fetch(
				process.env.AUTHAPI + "submitquestionprofilelist",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ userid: id, question: question }),
				}
			);
			const responseText = await response.text();
			let data;
			try {
				data = JSON.parse(responseText);
			} catch (error) {
				console.error(`Failed to parse the response: ${error}`);
				res.render("loginhandler.ejs", {
					error: "Failed submitting the question!",
				});
				return; //console.log('Failed submitting the question!')
			}
			if (response.status === 500) {
				res.render("loginhandler.ejs", {
					error: "Failed submitting the question!",
				});
				return; //console.log('Failed submitting the question!')
			}
			if (!response.ok) {
				throw new Error(response.statusText, "\n Error");
			}

			res.redirect("/home/askme/admin/" + token + "/profile");
			// console.log('Successssssss')
		} catch (error) {
			console.error(error);
			res.render("askme.ejs", {
				error: "The server is currently down/under maintenance!",
			});
		}
	}
);

app.get("/logout", beforeLoad, async (req, res) => {
	let cookies = new Cookies(req, res);
	let onesec = new Date().setTime() + 1;
	if (!cookies) {
		return res.render("loginhandler.ejs", { error: "No cookies detected!" });
	}

	cookies.set("email", 0, { expires: onesec });
	cookies.set("token", 0, { expires: onesec });
	cookies.set("username", 0, { expires: onesec });
	cookies.set("id", 0, { expires: onesec });
	// console.log('Successfully deleting the cookies!')
	res.render("loginhandler.ejs", {
		success: "Your account has been logged out!",
	});
});

app.get(
	"/home/askme/admin/:qid/questions/:id",
	beforeLoad,
	async (req, res) => {
		// Get the ID of the question from the request parameters
		let cookies = new Cookies(req, res);
		let token = cookies.get("token");

		if (!token) {
			// return res.redirect('/home/askme/admin/login')
			return res.render("loginhandler.ejs", {
				error: "Your session has been expired!",
			});
		}
		const id = req.params.id;
		const qid = req.params.qid;
		try {
			const response = await fetch(process.env.AUTHAPI + "questions/" + id, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			const response1 = await fetch(
				process.env.AUTHAPI + `getquestiontitle/${qid}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}
			);
			const title = await response1.json();

			const data = await response.json();
			res.render("questionsinterface.ejs", {
				layout: false,
				questions: data,
				title: title.questiontitle,
			});
		} catch (error) {
			console.error(error);
			res.render("adminaskme.ejs", {
				error: "The server is currently down/under maintenance!",
			});
		}

		// try {
		//   const response = await fetch(process.env.AUTHAPI + 'getquestiontitle/${qid}`, {
		//     method: 'POST',
		//     headers: { 'Content-Type': 'application/json' },
		//   });
		//   const title = await response.json();
		//   // console.log(title.error)
		//   // res.render("askme.ejs", { id: id, title: title.questiontitle, error: title.error });
		//   res.render('questionsinterface.ejs', { questions: title.questiontitle });
		// } catch(err) {
		//   console.log(err);
		//   // res.render("askme.ejs", { title: "Aww Snap!", id: id , error: "Server offline please try again later!"});
		// }
	}
);

app.get(
	"/home/askme/admin/:id1/questions/:id1/:id/delete",
	beforeLoad,

	async (req, res) => {
		let cookies = new Cookies(req, res);
		let token = cookies.get("token");

		if (!token) {
			// return res.redirect('/home/askme/admin/login')
			return res.render("loginhandler.ejs", {
				error: "Your session has been expired!",
			});
		}
		const id = req.params.id;
		const qid = req.params.id1;

		try {
			const response = await fetch(
				process.env.AUTHAPI + "questions/" + id + "/delete",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}
			);
			// console.log(`Activity | Deleted (${id})`);
			res.redirect(`/home/askme/admin/${qid}`);
		} catch (error) {
			console.error(error);
			res.render("adminaskme.ejs", {
				error: "The server is currently down/under maintenance!",
			});
		}
	}
);

app.get("/home/askme/admin/:id/deletesession", beforeLoad, async (req, res) => {
	let cookies = new Cookies(req, res);
	let token = cookies.get("token");

	if (!token) {
		// return res.redirect('/home/askme/admin/login')
		return res.render("loginhandler.ejs", {
			error: "Your session has been expired!",
		});
	}
	const id = req.params.id;

	try {
		const response = await fetch(
			process.env.AUTHAPI + "session/" + id + "/delete",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
			}
		);
		// console.log(`Activity | Deleted Session (${id})`);
		res.redirect(`/home/askme/admin/${token}/profile`);
	} catch (error) {
		console.error(error);
		res.render("adminaskme.ejs", {
			error: "The server is currently down/under maintenance!",
		});
	}
});

app.get("*", beforeLoad, (req, res) => {
	res.redirect("/home");
});
// TODO Bikin Profile, Kelarin UI, Cookies, and more.
