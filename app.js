// invocacion de exprees
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const mysql = require("./database/db");
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

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
let tareasrestantes = []

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
let correo = ""
app.post("/auth", async (req, res) => {
  correo = req.body.correo;
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
        req.session.id = results[0].id
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
let tarea1 = [],
  calificado1 = []
//auth paginas
app.get('/', (req, res) => {
  if (req.session.loggedin && req.session.rol === "estudiante") {
    mysql.query("SELECT id FROM user WHERE email = ?", [correo], async (error, result) => {

      const id = result[0].id;
      console.log(id);
      mysql.query(`SELECT tarea_id FROM completado WHERE user_id = ${id} `, async (error, result1) => {
        if (error) {
          console.log(error);
        }
        let str = ""
        for (const tarea of result1) {
          str += tarea.tarea_id + ", "
        }
        let tareasCompletadas = str.substring(0, str.length - 2);
        console.log("Tareas completadas " + tareasCompletadas);
        if (tareasCompletadas.length > 0) {
          mysql.query(`SELECT * FROM Tareas WHERE id NOT IN (${tareasCompletadas})`, async (error, tareas) => {
            if (error) {
              console.log(error);
            } else {
              tareasrestantes = tareas

              mysql.query(`SELECT * FROM completado WHERE calificacion IS NOT NULL AND user_id = ${id}`, async (error, calificado) => {
                if (error) {
                  console.log(error);
                } else {
                  calificado1 = calificado
                  console.log("Tareas calificadas " + calificado);
                  mysql.query("SELECT id, materia, titulo FROM Tareas", async (error, tarea) => {
                    if (error) {
                      console.log(error);
                    } else {
                      tarea1 = tarea
                      res.render('landing', {
                        login: true,
                        id: req.session.id,
                        name: req.session.name,
                        rol: req.session.rol,
                        tareas: tareasrestantes,
                        completado: calificado,
                        tareastotal: tarea
                      })
                    }
                  })
                }
              })

            }



          })
        } else {
          mysql.query(`SELECT * FROM Tareas`, async (error, tareas) => {
            if (error) {
              console.log(error);
            } else {
              tareasrestantes = tareas

              mysql.query(`SELECT * FROM completado WHERE calificacion IS NOT NULL AND user_id = ${id}`, async (error, calificado) => {
                if (error) {
                  console.log(error);
                } else {
                  calificado1 = calificado

                  console.log("Tareas calificadas " + calificado);
                  mysql.query("SELECT id, materia, titulo FROM Tareas", async (error, tarea) => {
                    if (error) {
                      console.log(error);
                    } else {
                      tarea1 = tarea

                      res.render('landing', {
                        login: true,
                        id: req.session.id,
                        name: req.session.name,
                        rol: req.session.rol,
                        tareas: tareasrestantes,
                        completado: calificado,
                        tareastotal: tarea
                      })
                    }
                  })

                }
              })

            }
          })

        }


      })

    })



  } else {
    if (req.session.loggedin && req.session.rol === "profesor") {
      res.render('dashboard', {
        login: true,
        name: req.session.name,
        rol: req.session.rol
      })
    } else {
      res.render('index', {
        login: false,
        name: "Para ingresar debe iniciar sesion"
      })

    }

  }
})

app.get('/crearTarea', (req, res) => {
  if (req.session.loggedin && req.session.rol === "estudiante") {
    res.render('index', {
      login: true,
      name: req.session.name,
      rol: req.session.rol

    })
  } else {
    if (req.session.loggedin && req.session.rol === "profesor") {
      res.render('crearTarea', {
        login: true,
        name: req.session.name,
        rol: req.session.rol
      })
    } else {
      res.render('index', {
        login: false,
        name: "Para ingresar debe iniciar sesion"
      })

    }

  }
})
let resultcompletado = [],
  resultusuaio = [],
  resulttareas = []

app.get('/calificar', (req, res) => {
  if (req.session.loggedin && req.session.rol === "estudiante") {
    res.render('index', {
      login: true,
      name: req.session.name,
      rol: req.session.rol

    })
  } else {
    if (req.session.loggedin && req.session.rol === "profesor") {

      mysql.query("SELECT * FROM completado WHERE calificacion IS NULL", async (error, resultcompletado) => {
        mysql.query("SELECT id, nombre FROM user", async (error, resultusuaio) => {
          mysql.query("SELECT id, titulo, descripcion, materia FROM Tareas", async (error, resulttareas) => {
            res.render('calificar', {
              login: true,
              datacompletado: resultcompletado,
              datausuario: resultusuaio,
              datatarea: resulttareas,
              name: req.session.name,
              rol: req.session.rol
            })
          })


        })

      })



    } else {
      res.render('index', {
        login: false,
        name: "Para ingresar debe iniciar sesion"
      })

    }

  }
})

//Subir y bajar archivos de s3


aws.config.update({
  secretAccessKey: process.env.ACCESS_SECRET,
  accessKeyId: process.env.ACCESS_KEY,
  region: process.env.REGION
})
let filename = ""
const BUCKET = process.env.BUCKET
const s3 = new aws.S3()
const upload = multer({
  storage: multerS3({
    bucket: BUCKET,
    s3: s3,
    acl: "public-read",
    key: (req, file, cb) => {
      let definer = new Date().toString().split("G");
      definer = definer[0].slice(3).replace(/ /g, "-")
      cb(null, definer + file.originalname);
      filename = definer + file.originalname
    }
  })

})

app.post('/upload', upload.single("file"), (req, res) => {

  if (req.session.rol === "profesor") {
    const titulo = req.body.titulo;
    const materia = req.body.materia;
    const descripcion = req.body.descripcion;
    const srcname = filename;

    console.log(req.body);
    mysql.query('INSERT INTO Tareas SET ?', {
      titulo,
      descripcion,
      materia,
      srcname

    }, async (error, results) => {
      if (error) {
        console.log(error);
      } else {
        res.render('crearTarea', {
          alert: true,
          name: req.session.name,
          alertTitle: "Correcto",
          alertMessage: "Tarea publicada",
          alertIcon: 'success',
          showConfirmButton: false,
          timer: 4000,
        });
      }
    });





    console.log(req.file);
  } else {

    mysql.query("SELECT * FROM user WHERE email = ?", [correo], async (error, result) => {
      let id_user = result[0].id
      console.log("id de usuario " + id_user)

      const srcname = filename;
      const idtarea = req.body.idtarea;

      mysql.query('INSERT INTO completado SET ?', {
        user_id: result[0].id,
        tarea_id: idtarea,
        srcname,

      }, async (error, results) => {
        if (error) {
          console.log(error);
        } else {

          res.render('landing', {
            alert: true,
            rol: req.session.rol,
            tareas: tareasrestantes,
            completado: calificado1,
            tareastotal: tarea1,
            name: req.session.name,
            alertTitle: "Correcto",
            alertMessage: "Tarea entregada",
            alertIcon: 'success',
            showConfirmButton: false,
            timer: 4000,
            ruta: "/"
          });
        }
      });

    })



    console.log("id de la tarea" + req.body.idtarea);

  }

})


app.post("/updatecompletado", (req, res) => {
  console.log(req.body);
  const idcompletado = req.body.idcompletado
  const calif = req.body.Calificacion

  mysql.query(`UPDATE completado SET calificacion = ${calif} WHERE id = ${idcompletado}`, async (error, result) => {

    if (error) {
      console.log(error);
    } else {
      console.log("completado");
      res.render('calificar', {
        alert: true,
        rol: req.session.rol,
        name: req.session.name,
        datacompletado: resultcompletado,
        datausuario: resultusuaio,
        datatarea: resulttareas,
        alertTitle: "Correcto",
        alertMessage: "Tarea Calificada",
        alertIcon: 'success',
        showConfirmButton: false,
        timer: 4000,
        ruta: "/calificar"
      });
    }
  })
})

app.get("/list", async (req, res) => {
  let r = await s3.listObjectsV2({
    Bucket: BUCKET
  }).promise()
  let x = r.Contents.map(item => item.Key)
  res.send(x)
})

app.get("/download/:filename", async (req, res) => {
  const filename = req.params.filename
  let x = await s3.getObject({
    Bucket: BUCKET,
    Key: filename
  }).promise()
  res.send(x.Body)
})

app.delete("/delete/:filename", async (req, res) => {
  const filename = req.params.filename
  await s3.deleteObject({
    Bucket: BUCKET,
    Key: filename
  }).promise()

  res.send("file deleted succesfully")
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