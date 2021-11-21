const mysql = require("mysql");
require("dotenv").config({
  path: "./env/.env"
});

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
});
connection.connect((error) => {
  error
    ?
    console.log(
      `Se ha encontrado un error al conectar a la base de datos ${error}`
    ) :
    console.log(`Conexion exitosa`);
});

module.exports = connection;