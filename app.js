// invocacion de exprees
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const mysql = require("./database/db");

// settings para capturar formularios
app.use(express.urlencoded({
  extended: false
}));
app.use(express.json());
//invocacion de dotenv
const dotenv = require("dotenv");
dotenv.config({
  path: "./env/.env"
});
// Directorio public
app.use("/resources", express.static("public"));
app.use("/resources", express.static(__dirname + "/public"));

// Motor de plantillas ejs
app.set("view engine", "ejs");

//encriptar claves con bbcryptjs
const bcryptjs = require("bcryptjs");

// var Session
const session = require("express-session");
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
// rutas

app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/register", (req, res) => {
  res.render("register");
});

app.get('/landing', (req, res) => {
  res.render("landing")
})


// Registro

app.post("/register", async (req, res) => {
  const nombre1 = req.body.nombre.toUpperCase();
  const apPaterno = req.body.appaterno.toUpperCase();
  const apMaterno = req.body.apmaterno.toUpperCase();
  const correo = req.body.correo;
  const password1 = req.body.password;
  const rol = req.body.rol;

  let passwordHaash = await bcryptjs.hash(password1, 8);
  mysql.query('SELECT * FROM user WHERE email = ' + `"${correo}"`, async (error, result) => {
    if (error) {
      console.log(error);
    } else {
      if (result.length === 0) {
        mysql.query('INSERT INTO user SET ?', {
          user: nombre1,
          nombre: nombre1 + " " + apPaterno + " " + apMaterno,
          email: correo,
          rol,
          password: passwordHaash
        }, async (error, results) => {
          if (error) {
            console.log(error);
          } else {
            res.render('register', {
              alert: true,
              alertTitle: "Registration",
              alertMessage: "¡Successful Registration!",
              alertIcon: 'success',
              showConfirmButton: false,
              timer: 3000,
              ruta: '/'
            });
            //res.redirect('/');         
          }
        });
      } else {
        res.render('register', {
          alert: true,
          alertTitle: "Registration",
          alertMessage: "Error de registro el correo ya esta en uso",
          alertIcon: 'error',
          showConfirmButton: false,
          timer: 3000,
          ruta: ''
        });
      }
      console.log(result);
    }
  })

})
// Autenticacion

app.post("/auth", async (req, res) => {
  const correo = req.body.correo;
  const pass = req.body.password;
  // await bcryptjs.hash(pass, 8)
  if (correo && pass) {
    mysql.query('SELECT * FROM user WHERE email = ?', [correo], async (error, results) => {
      /* if (result.length === 0 || !(await bcryptjs.compare(pass, result[0].password))) {
        res.send("usuario o contraseña incorrecots")
      }  */


      if (results.length === 0 || !(await bcryptjs.compare(pass, results[0].password))) {
        res.render('login', {
          alert: true,
          alertTitle: "Error",
          alertMessage: "Error de login Usuario o Contraseña incorrectos",
          alertIcon: 'error',
          showConfirmButton: false,
          timer: 3000,
          ruta: 'login'
        })

      } else {
        req.session.loggedin = true
        req.session.name = results[0].nombre
        req.session.rol = results[0].rol
        console.log(req.session.rol);
        res.render('login', {
          alert: true,
          alertTitle: "Conexion exitosa",
          alertMessage: " Login correcto",
          alertIcon: 'success',
          showConfirmButton: false,
          timer: 1500,
          ruta: '/'
        })
      }

    })
  } else {
    res.render('login', {
      alert: true,
      alertTitle: "Advertencia",
      alertMessage: "Ingrese un usuario y contraseña",
      alertIcon: 'warning',
      showConfirmButton: false,
      timer: 3000,
      ruta: 'login'
    })
  }

})

//auth paginas
app.get('/', (req, res) => {
  if (req.session.loggedin && req.session.rol === "estudiante") {
    res.render('landing', {
      login: true,
      name: req.session.name,
      rol: req.session.rol
    })
  } else {
    if (req.session.loggedin && req.session.rol === "profesor") {
      res.render('dashboard', {
        login: true,
        name: req.session.name,
        rol: req.session.rol
      })
    } else {
      res.render('landing', {
        login: false,
        name: "Para ingresar debe iniciar sesion"
      })

    }

  }
})

// logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login')
  })
})



app.listen(port, (req, res) => {
  console.log(`Server running in: http://localhost:${port}`);
});