const express = require ('express'); 
const cors = require('cors'); 
const monk = require('monk'); 
const bodyParser = require('body-parser');
const morgan = require('morgan'); 
const mongo = require('mongodb').MongoClient; 
const objectId = require('mongodb').ObjectID; 
const moment = require('moment');
const {format} = require('util');
const Multer = require('multer');
const Cloud = require('@google-cloud/storage');
const path = require('path');
const serviceKey = path.join(__dirname, './googleApiKeys.json');
let _ = require('lodash');
const jwt = require('jsonwebtoken');

let fecha = moment();

const { Storage } = Cloud;
const gc = new Storage({ keyFilename: serviceKey, projectId: 'boolbitest', });

const app = express();  

//Estos dos son para que el sistema no tire error porque la actualizacion de productos es muy grande (con las fotos pesa mucho). Igual optimizar más adelante (no deberia ser dificil)
app.use(express.static('public'));
app.use(bodyParser.json({limit: '10mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));

const port = process.env.PORT || 5000;

app.listen(port, () => { console.log(`Sistema establecido desde el puerto ${port}. All systems looking good.`) });  

app.use(morgan('dev'));  

app.use(cors());   
app.use(express.json());  
app.get('/', (request, response) => { response.json({ message: 'Todo Bien por aqui' }); }); 


let drugstoreX;

//Links para acceder a la base de datos. OJO QUE ".GET" ES PARA CREAR COLECCIONES O ACCEDER A LA COLECCION, NO PARA EXTRAER COSAS DE AHI (OSEA EN TODO CASO AL FINAL IGUAL SE HACE ESO)
const db = monk(`mongodb+srv://mongoMainUser:googlenexus@cluster0.hzd2c.mongodb.net/test?retryWrites=true&w=majority`);  
const usuarios = db.get('usuarios');
const farmacias =  db.get('farmacias');
const recetas = db.get('recetas'); 

//Una vez accedida a la base de datos con éxito esto nos avisa que accedimos.
db.then(() =>{ console.log("Conectado a la base de datos. Sin errores"); }).catch((e)=>{ console.error("Error !",e); }); 

function makeid(length) { let result = ''; let characters       = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz'; let charactersLength = characters.length; for ( let i = 0; i < length; i++ ) { result += characters.charAt(Math.floor(Math.random() * charactersLength)); }; return result; };



// REGISTRO. Ruta para Guardar Nuevos Usuarios. Se activa al apretar botón de "Registrar". 
app.post('/registro', (request, response) => {
    const usuario = {
        name: request.body.nombre,
        email: request.body.mail,
        password: request.body.password,
        rut: request.body.rut,
        created: fecha
    }
    const _id = request.body._id;

    usuarios
    .update({"_id": objectId(_id)}, {$set: usuario}, {upsert:true, multi: true})
    .then(usuarioCreado => {
        response.json(usuarioCreado);
    });
});

app.post('/registroFarmacia', (request, response) => {
    const drugstoreUser = {
        name: request.body.nombre,
        email: request.body.mail,
        password: request.body.password,
        rut: request.body.rut,
        created: fecha
    };
    const _id = request.body._id;
    farmacias
    .update({"_id": objectId(_id)}, {$set: drugstoreUser}, {upsert:true, multi: true})
    .then(() => { response.json("Done"); });
});

// LOGIN. Ruta para Ingresar como doctor.
app.post('/loginDoctores', (request, response) => {
    const usuario = {
        rut: request.body.rut,
        password: request.body.password,
    };

    async function verifyUser() {
        let user = await usuarios.findOne({ rut: usuario.rut })
        
        if (user) {
            if (user.password == usuario.password) {
                let token = jwt.sign({ userID: user._id, email: user.email, name: user.name, rut: user.rut }, "claveSecreta", { expiresIn: "1hr" });
                let res = {acceso: "Permitir", token: token};
                response.json(res);
            }
            else { let res = {acceso: "Contraseña Equivocada", token: null}; response.json(res); }
        }
        else { let res = {acceso: "Usuario no encontrado", token: null}; response.json(res); }
    }
    verifyUser();
});

// LOGIN. Ruta para Ingresar. Se activa al apretar botón de "login". 
app.post('/loginDrugstore', (request, response) => {
    const usuario = { rut: request.body.rut, password: request.body.password, };

    async function proof() {
        let user = await farmacias.findOne({ rut: usuario.rut })
        
        if (user) {
            if (user.password == usuario.password) {
                drugstoreX = user;
                response.json("Permitir");
            }
            else {
                response.json("Contraseña Equivocada")
            }
        }
        else {
            response.json("Usuario no encontrado")
        }
    }
    proof();
});

app.post('/newPatient', (request, response) => {
    let token = jwt.decode(request.body.token);
    let data = request.body.data;
    const paciente = {
        paciente: data.paciente,
        rut: data.rut,
        comentario: data.comentario,
        telefono: data.telefono,
        mail: data.mail,
        telefonoSecundario: data.telefonoSecundario,
        direccion: data.direccion,
    };
    usuarios.update({ "_id": objectId(token.userID)}, { $push: { pacientes: paciente } }, {upsert:true, multi: false}).then(() => { response.json("Done"); });  
});


app.get('/getPatients', (request, response) => {
let decoded = jwt.decode(request.query.token);
let rut = decoded.rut;
let pacients = [];
async function queryPacients() { let query = await usuarios.aggregate([{ "$match": { "rut": rut } }, { $project: { _id: 0, created: 0, email: 0, name: 0, password: 0, rut: 0, medicamentos: 0 } }, ]); pacients.push(query); return "Done"; };
queryAll(); async function queryAll() { let pacientsQuery = await queryPacients(); if (pacientsQuery) { response.json(pacients[0][0].pacientes); }; };
});


app.post('/newDrug', (request, response) => {
    let token = jwt.decode(request.body.token);
    let data = request.body.data;

    const medicamento = {
        medicamento: data.medicamento,
        fabricante: data.fabricante,
        formato: data.formato,
        dosis: data.dosis,
        drugID: data.drugID
    };
        usuarios.update({ "_id": objectId(token.userID)}, { $push: { medicamentos: medicamento } }, {upsert:true, multi: false}).then(() => { response.json("Done"); });  
});


app.get('/getDrugs', (request, response) => {
    let decoded = jwt.decode(request.query.token);
    let rut = decoded.rut;
    let drugs = [];
    async function queryDrugs() { let query = await usuarios.aggregate([{ "$match": { "rut": rut } }, { $project: { _id: 0, created: 0, email: 0, name: 0, password: 0, rut: 0, pacientes: 0 } }, ]); drugs.push(query); return "Done"; };
    queryAll();
    async function queryAll() {
        let drugsQuery = await queryDrugs();
        if (drugsQuery) {
            response.json(drugs[0][0].medicamentos);
        };
    };
});

// app.post('/pene', (request, response) => { 
//     var decoded = jwt.decode(request.body.token);
//     console.log(decoded);

//     // let drugs = [];
//     // async function queryDrugs() { let query = await usuarios.aggregate([{ "$match": { "rut": userX.rut } }, { $project: { _id: 0, created: 0, email: 0, name: 0, password: 0, rut: 0, pacientes: 0 } }, ]); drugs.push(query); return "Done"; };
//     // queryAll();
//     // async function queryAll() {
//     //     let drugsQuery = await queryDrugs();
//     //     if (drugsQuery) {
//     //         response.json(drugs[0][0].medicamentos);
//     //     };
//     // };
// }); 
// app.post('/pene', (request, response) => { 
//     console.log("algo llega wn")
// }); 


app.post('/newPrescription', (request, response) => {

    let token = jwt.decode(request.body.token);
    let data = request.body.data;

    const prescription = {
        nombreDoctor: token.name,
        rutDoctor: token.rut,
        nombrePaciente: data.selectedPatient.paciente,
        rutPaciente: data.selectedPatient.rut,
        comentarios: data.comentarios,
        medicamentosRecetados: data.medicamentosRecetados,
        created: data.fecha
    }
    const _id = request.body._id;

    recetas
    .update({"_id": objectId(_id)}, {$set: prescription}, {upsert:true, multi: true})
    .then(() => {
        response.json("Done");
    });
});

app.post('/searchPrescription', (request, response) => {

    let x = request.body.rut;
    recetas .find({ rutPaciente: x}).then(data => { response.json(data); });
});





