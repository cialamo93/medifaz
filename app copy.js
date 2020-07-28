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


const { Storage } = Cloud;
const gc = new Storage({
  keyFilename: serviceKey,
  projectId: 'boolbitest',
});

//gc.getBuckets().then(x => console.log(x));

const bucket = gc.bucket('test_boolbi');


const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // Con esto especificamos el peso maximo del archivo
    },
  });
  






const apikey = "AeRX92rFRP6xjbG1dGzawz"; //COMPRAS
const client = require('filestack-js').init(apikey); //COMPRAS

const app = express(); //TODOS

//const fileUpload = require('express-fileupload'); //COMPRAS
const fs = require('fs'); //COMPRAS
const pdf = require('pdf-parse'); //COMPRAS


//app.use(fileUpload()); //COMPRAS

//Estos dos son para que el sistema no tire error porque la actualizacion de productos es muy grande (con las fotos pesa mucho). Igual optimizar más adelante (no deberia ser dificil)
app.use(bodyParser.json({limit: '10mb', extended: true}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));

app.listen(5000, () => {
    console.log("Dandole en el 5000, todo bien por acá")
}); //TODOS

app.use(morgan('dev')); //TODOS

app.use(cors()); //TODOS 
app.use(express.json()); //TODOS

app.get('/', (request, response) => {
    response.json({
        message: 'Todo Bien por aqui'
    });
}); //TODOS

let userx; //Nombre de usuario que accesa al sistema

//Links para acceder a la base de datos. OJO QUE ".GET" ES PARA CREAR COLECCIONES O ACCEDER A LA COLECCION, NO PARA EXTRAER COSAS DE AHI (OSEA EN TODO CASO AL FINAL IGUAL SE HACE ESO)
const db = monk(`mongodb+srv://alamo:googlenexus@gladstone-ufpyx.mongodb.net/test?retryWrites=true&w=majority`); //TODOS
const usuarios = db.get('usuarios');  //NUEVO

//Una vez accedida a la base de datos con éxito esto nos avisa que accedimos.
db.then(() =>{
    console.log("Conectado a la base de datos. Sin errores");

  }).catch((e)=>{
    console.error("Error !",e);
  }); //TODOS

  function makeid(length) {
    let result           = '';
    let characters       = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    };
    return result;
 };

//Funcion creada para que cada usuario tenga sus propias colecciones en mongoDB.
function modulos() {
    const inventario = db.get(`inventario-${userx}`); //INVENTARIO
    const compras = db.get(`compras-${userx}`); //COMPRAS
    const ventas = db.get(`ventas-${userx}`); //VENTAS Y CLIENTES
    const clientes = db.get(`clientes-${userx}`); //VENTAS Y CLIENTES
    const nomina = db.get(`nomina-${userx}`); //NUEVO
    const proveedores = db.get(`proveedores-${userx}`); //NUEVO
    const costos = db.get(`costos-${userx}`); //NUEVO
    const productos = db.get(`productos-${userx}`); //NUEVO
    const pruebaDeVentas = db.get(`pruebaDeVentas-${userx}`);
    const pruebaDeCompras = db.get(`pruebaDeCompras-${userx}`);
    const inventarioDePrueba = db.get(`inventarioDePrueba-${userx}`);
    const userProfile = db.get(`userProfile-${userx}`);


    

// async function foo () {
//     let data = await inventario.findOneAndDelete(
//         { _children : { $size: 0 } }
//      )
//      console.log(data);
// }
// foo();



//RUTAS:

// INVENTARIO. Ruta para extraer datos del servidor.
app.get('/inventario', (request, response) => {

    //Esto es para que solo retorne los inventarios no borrados por no tener stock. Los inventarios no los borramos aún para tener disponible su información para los graficos de inventario.
    inventario.aggregate([
      {$project: {
          producto: 1,
          sku: 1,
         _children: {$filter: {
            input: '$_children',
            as: 'item',
            cond: { $eq : ['$$item.deleted', "no"] }
         }},
      }},
      { $match: { "_children.0": {  "$exists": true } } }//Con esto solo nos entrega los elementos que tienen por lo menos un "no deleted", para no corromper la tabla.
    ])
        .then(inven => {
            response.json(inven);
        });
});

// INVENTARIO. Ruta para extraer datos para los gráficos de inventario, ya que estos datos incluyen elementos borrados de la tabla por no tener stock (deleted: "yes").
app.get('/inventarioNoDelete', (request, response) => {
    inventario
        .find({})
        .then(graficosInv => {
            response.json(graficosInv);
        });
});

// INVENTARIO. Ruta para eliminar documentos vacíos (sin _children).
app.post('/borrarVacios', (request, response) => {
    
    inventario
        .findOneAndDelete(
        { _children : { $size: 0 } }
     )
        .then(childrenDeleted => {
            response.json(childrenDeleted);
        });
}); 


// INVENTARIO. Ruta para agregar productos y Guardar Cambios en inventario luego de agregar y actualizar productos. Se activa al apretar botón de "Agregar Producto" "Guardar Cambios". 
app.post('/inventario', (request, response) => {
    const inv = { proveedor: request.body.proveedor, producto: request.body.producto, sku: request.body.sku, costo: request.body.costo, precio: request.body.precio, cantidad: request.body.cantidad, fecha: request.body.fecha };
    const _id = request.body._id;
    let totalInicial = inv.costo * inv.cantidad;
    let cantidadInicial = inv.cantidad;

    //Para saber si el producto existe y meterlo a un datatree o crear uno nuevo en el inventario. Ojo que "count" esta deprecated asique parece que lo sacan en el futuro, asique revisar más adelante.
    async function existe () {
        let data = await inventario.count({'sku': inv.sku});
        if(data == 0) {
            inventario
            .update({"sku": inv.sku}, { $set: { 'producto': inv.producto, 'sku': inv.sku, '_children': [ {id: makeid(5), fecha: inv.fecha, proveedor: inv.proveedor, producto: inv.producto, sku: inv.sku, costo: inv.costo, cantidad: inv.cantidad, totalInicial: totalInicial, cantidadInicial: cantidadInicial, deleted: "no" } ] } }, {upsert:true, multi: false})//Cambiado el 09/04 por sospecha de malfuncionamiento. Se cambió "invtot.sku" por "cominv.sku"
            .then(inventarioCreado => { response.json(inventarioCreado); });
      }
      else {
            inventario
            .update({"sku": inv.sku}, { $push: { _children: {id: makeid(5), fecha: inv.fecha, proveedor: inv.proveedor, producto: inv.producto, sku: inv.sku, costo: inv.costo, cantidad: inv.cantidad, cantidadInicial: cantidadInicial, totalInicial: totalInicial, deleted: "no" } } }, {upsert:true, multi: false})//Cambiado el 09/04 por sospecha de malfuncionamiento. Se cambió "invtot.sku" por "cominv.sku"
            .then(inventarioCreado => { response.json(inventarioCreado); });
      }
    }
    existe();
});

// INVENTARIO. Ruta para eliminar productos del inventario. Se activa al apretar botón de "eliminar productos".
app.post('/borrarinventario', (request, response) => {
    const indice = request.body.eliminar;
    inventario.remove({ "_id": objectId(indice)}).then(inventarioBorrado => { response.json(inventarioBorrado); });
});

//Para borrar inventario nested
app.post('/borrarInventarioNested', (request, response) => {
    
    let sku = request.body.sku;
    let del = request.body.id;
    
    inventario.update(
        { sku : sku },
        { $pull: { _children: { id: del } } },
        { multi: true }
      )
      .then(nestedBorrado => {
        response.json(nestedBorrado);
    });
});


// COMPRAS. Ruta para extraer datos del servidor.
app.get('/compras', (request, response) => {
    compras.find({}).then(compras => { response.json(compras); });
});
  
// COMPRAS. Ruta para Guardar Cambios en compras luego de agregar y actualizar productos. Se activa al apretar botón de "Guardar Cambios". 
app.post('/compras', (request, response) => {
    const invtot = { idOperacion: makeid(6), link: request.body.link, producto: request.body.producto, proveedor: request.body.proveedor, sku: request.body.sku, costo: parseInt(request.body.costo), cantidad: parseFloat(request.body.cantidad), total: parseInt(request.body.total), fecha: request.body.fecha, fechaDePago: request.body.fechaDePago, tipo: "Egresos", categoria: "Compras" };
    const _id = request.body._id;
    compras.update({"_id": objectId(_id)}, {$set: invtot}, {upsert:true, multi: true}).then(comprasCreado => { response.json(comprasCreado); });
});

// COMPRAS. Ruta para eliminar productos. Se activa al apretar botón de "eliminar productos".
app.post('/borrarcompras', (request, response) => {
    const indice = request.body.id;
    compras
    .remove({ "_id": objectId(indice)})
    .then(comprasBorrado => {
        response.json(comprasBorrado);
    });
});

// COMPRAS. Ruta para agregar productos en INVENTARIO luego de agregar compras. Se activa al apretar botón de "Guardar Cambios" o "Agregar Compra". 
app.post('/compinv', (request, response) => {
    const compinv = { proveedor: request.body.proveedor, producto: request.body.producto, sku: request.body.sku, costo: request.body.costo, cantidad: request.body.cantidad, fecha: request.body.fecha };
    // const _id = request.body._id;
    
    //Para darle un id a cada nested row y despues poder borrarlo. 

     let totalInicial = compinv.costo * compinv.cantidad;
     let cantidadInicial = compinv.cantidad;

    //Para saber si el producto existe y meterlo a un datatree o crear uno nuevo en el inventario. Ojo que "count" esta deprecated asique parece que lo sacan en el futuro, asique revisar más adelante.
    async function existe () {
        let data = await inventario.count({'sku': compinv.sku});
        if(data == 0) {
            inventario
            .update({"sku": compinv.sku}, { $set: { 'producto': compinv.producto, 'sku': compinv.sku, '_children': [ {id: makeid(5), fecha: compinv.fecha, proveedor: compinv.proveedor, producto: compinv.producto, sku: compinv.sku, costo: compinv.costo, cantidad: compinv.cantidad, totalInicial: totalInicial, cantidadInicial: cantidadInicial, deleted: "no" } ] } }, {upsert:true, multi: false})//Cambiado el 09/04 por sospecha de malfuncionamiento. Se cambió "invtot.sku" por "cominv.sku"
            .then(inventarioCreado => {
                response.json(inventarioCreado);
            });
      }
      else {
            inventario
            .update({"sku": compinv.sku}, { $push: { _children: {id: makeid(5), fecha: compinv.fecha, proveedor: compinv.proveedor, producto: compinv.producto, sku: compinv.sku, costo: compinv.costo, cantidad: compinv.cantidad, totalInicial: totalInicial, cantidadInicial: cantidadInicial, deleted: "no" } } }, {upsert:true, multi: false})//Cambiado el 09/04 por sospecha de malfuncionamiento. Se cambió "invtot.sku" por "cominv.sku"
            .then(inventarioCreado => {
                response.json(inventarioCreado);
            });
      }
    }
    existe();
});

// VENTAS. Ruta para extraer datos del servidor.
app.get('/ventas', (request, response) => { ventas.find({}).then(ventas => { response.json(ventas); }); });

// VENTAS. Ruta para Guardar Cambios en ventas luego de agregar y actualizar productos. Se activa al apretar botón de "Guardar Cambios". 
app.post('/ventas', (request, response) => {

    const invtot = { idOperacion: makeid(6), cliente: request.body.cliente, producto: request.body.producto, sku: request.body.sku, precio: parseInt(request.body.precio), costo: parseInt(request.body.costo), cantidad: parseFloat(request.body.cantidad), total: parseInt(request.body.total), utilidad: parseInt(request.body.utilidad), fecha: request.body.fecha, fechaDeCobro: request.body.fechaDeCobro, tipo: "Ingresos", categoria: "Ventas" };
    const _id = request.body._id;
    
    ventas.update({"_id": objectId(_id)}, {$set: invtot}, {upsert:true, multi: true}).then(ventasCreado => { response.json(ventasCreado); });
});

// VENTAS. Ruta para disminuir stock a INVENTARIO luego de agregar ventas. Se activa al apretar botón de "Agregar Venta". 
app.post('/ventinv', (request, response) => {
    
    if (request.body[0] !== undefined || null) {

    //Aca a diferencia de otras rutas revisa si el sku es el mismo para no duplicar elementos. Disminuye la cantidad vendida y cambia la fecha de modificación. El if de arriba es por si venden un producto con un sku no determinado. 
    let children = request.body;
    let sku = request.body[0].sku;

   inventario
    .update({ "sku": sku }, { $set: { '_children': children } }, {multi: true})      
    .then(inventarioCreado => {
        response.json(inventarioCreado);
    });
}

});

// VENTAS. Ruta para eliminar productos sin stock a INVENTARIO luego de agregar ventas. Se activa al apretar botón de "Agregar Venta". 
app.post('/ventInvNoStock', (request, response) => {

    if (request.body !== undefined || null) {

    let sku = request.body.sku;
    
    inventario.update(
        { sku : sku },
        { $pull: { _children: { cantidad: 0 } } },
        { multi: true }
      )
      .then(nestedBorrado => {
        response.json(nestedBorrado);
    });
}
});



// VENTAS. Ruta para eliminar ventas. Se activa al apretar botón de "eliminar productos".
app.post('/borrarventas', (request, response) => {
    const indice = request.body.id;
    ventas
    .remove({ "_id": objectId(indice)})
    .then(ventasBorrado => {
        response.json(ventasBorrado);
    });
});


// CLIENTES. Ruta para extraer datos del servidor.
app.get('/clientes', (request, response) => { clientes.find({}).then(client => { response.json(client); }); });

app.get('/allDataCustomers', (request, response) => {
        
    let queryData = [];

    async function querySales() { let query = await pruebaDeVentas.find({}); queryData.push({ventas: query}); return "Done"; };
    async function queryCustomers() { let query = await clientes.find({}); queryData.push({clientes: query}); return "Done"; };

    queryAll();
    async function queryAll() {
        let salesQuery = await querySales();
        let customersQuery = await queryCustomers();
        if (salesQuery && customersQuery) {
            let data = Object.assign({}, ...queryData);
            response.json(data);
        }; 
     };
 });
  
// CLIENTES. Ruta para Guardar Cambios luego de ACTUALIZAR un cliente.
app.post('/updateCustomer', (request, response) => {
    const customer = {
      direccion: request.body.direccion,
      ciudad: request.body.ciudad,
      mail: request.body.mail,
      telefono: request.body.telefono,
      telefonoSecundario: request.body.telefonoSecundario,
      giro: request.body.giro,
      sitioWeb: request.body.sitioWeb,
      ejecutivoACargo: request.body.ejecutivoACargo,
      comentario: request.body.comentario,
      imgURL: request.body.imgURL
    };
    const _id = request.body.customerId;
    clientes
    .update({"_id": objectId(_id)}, {$set: customer}, {upsert:true, multi: true})
    .then(() => { response.json("Done"); });
});


// CLIENTES. Ruta para Guardar Cambios luego de agregar y actualizar productos. Se activa al apretar botón de "Guardar Cambios". 
app.post('/clientes', (request, response) => {
    const cliente = { cliente: request.body.cliente, rut: request.body.rut, direccion: request.body.direccion, ciudad: request.body.ciudad, fecha: request.body.fecha, mail: request.body.mail, telefono: request.body.telefono, telefonoSecundario: request.body.telefonoSecundario, giro: request.body.giro, sitioWeb: request.body.sitioWeb, ejecutivoACargo: request.body.ejecutivoACargo, comentario: request.body.comentario, imgURL: request.body.imgURL };
    const _id = request.body._id;
    clientes.update({"_id": objectId(_id)}, {$set: cliente}, {upsert:true, multi: true}).then(() => { response.json("Done"); });
});

// CLIENTES. Ruta para eliminar productos. Se activa al apretar botón de "eliminar productos".
app.post('/borrarclientes', (request, response) => {
    const indice = request.body.id;
    clientes.remove({ "_id": objectId(indice)}).then(clientesBorrado => { response.json(clientesBorrado); });
});

// NOMINA. Para obtener la nómina.
app.get('/nomina', (request, response) => {
    nomina.find({}).then(nom => { response.json(nom); } );
});

// NOMINA. Ruta obtener la nómina sin fotos (para que pese menos y sea más rápido). Buscamos esta ruta en finanzas.
app.get('/nominaSinFotos', (request, response) => {

    //Esto es para que retorne la nómina sin fotos para que funcione más rápido y eficiente.
    nomina.aggregate([
      {$project: {
        foto: 0
      }},
    ])
        .then(nominaSinFotos => {
            response.json(nominaSinFotos);
        });
});

// NOMINA. Ruta para Guardar Empleados luego de agregar empleado. Se activa al apretar botón de "Agregar" (Nuevo Empleado).
app.post('/nomina', (request, response) => {
    const empleado = {
        run: request.body.run,
        nombre: request.body.nombre,
        direccion: request.body.direccion,
        telefono: request.body.telefono,
        telefonoSecundario: request.body.telefonoSecundario,
        sueldo: request.body.sueldo,
        cargo: request.body.cargo,
        mail: request.body.mail,
        fechaNacimiento: request.body.fechaNacimiento,
        foto: request.body.imgURL,
        contrato: request.body.pdfURL,
        cv: request.body.cvURL,
        fechaContratacion: request.body.fechaContratacion,
        fechaDespido: null,
        categoria: "Sueldos"
    };
    const _id = request.body._id;

    nomina.update({"_id": objectId(_id)}, {$set: empleado}, {upsert:true, multi: true}).then(empleadoCreado => { response.json(empleadoCreado); });
    // console.log(request.body)
});


// NOMINA. Ruta para eliminar empleados. Se activa al apretar botón de "eliminar empleado".
app.post('/eliminarEmpleado', (request, response) => {
    const id = request.body.id;
    nomina
    .remove({ "_id": objectId(id)})
    .then(nominaBorrado => {
        response.json(nominaBorrado);
    });
});


// PROVEEDORES. Ruta para extraer datos del servidor.
app.get('/proveedores', (request, response) => {
    proveedores
        .find({})
        .then(provider => {
            response.json(provider);
        });   
});
  

// PROVEEDORES. Ruta para AGREGAR proveedores.
app.post('/proveedores', (request, response) => {
    const prov = {
      proveedor: request.body.proveedor,
      rut: request.body.rut,
      direccion: request.body.direccion,
      ciudad: request.body.ciudad,
      mail: request.body.mail,
      telefono: request.body.telefono,
      telefonoSecundario: request.body.telefonoSecundario,
      giro: request.body.giro,
      sitioWeb: request.body.sitioWeb,
      ejecutivoACargo: request.body.ejecutivoACargo,
      comentario: request.body.comentario,
      fecha: request.body.fecha,
      logoURL: request.body.imgURL
    };
    const _id = request.body._id;
    proveedores
    .update({"_id": objectId(_id)}, {$set: prov}, {upsert:true, multi: true})
    .then(proveedoresCreado => {
        response.json(proveedoresCreado);
    });
});



//PROVEEDORES. Ruta para Guardar Cambios luego de ACTUALIZAR un proveedor.
app.post('/updateSupplier', (request, response) => {
    const prov = {
      rut: request.body.rut,
      direccion: request.body.direccion,
      ciudad: request.body.ciudad,
      mail: request.body.mail,
      telefono: request.body.telefono,
      telefonoSecundario: request.body.telefonoSecundario,
      giro: request.body.giro,
      sitioWeb: request.body.sitioWeb,
      ejecutivoACargo: request.body.ejecutivoACargo,
      comentario: request.body.comentario,
      logoURL: request.body.imgURL
    };
    const _id = request.body.supplierId;
    proveedores
    .update({"_id": objectId(_id)}, {$set: prov}, {upsert:true, multi: true})
    .then(proveedoresCreado => {
        response.json(proveedoresCreado);
    });
});


// PROVEEDORES. Ruta para eliminar proveedores.
app.post('/borrarProveedores', (request, response) => {
    const indice = request.body.id;
    proveedores
    .remove({ "_id": objectId(indice)})
    .then(proveedoresBorrado => {
        response.json(proveedoresBorrado);
    });
});

// COSTOS. Ruta para extraer datos (todos los datos) del servidor. Se usa solo en finanzas para solo hacer un pedido a la base de datos. En costos es más practico pedirlo por separado porque sino tira error (deberia ser facil de arreglar)
app.get('/costos', (request, response) => { costos.find({}).then(cost => { response.json(cost); }); });

// COSTOS. Ruta para extraer datos (solo los gastos) del servidor.
app.get('/gastos', (request, response) => {
    costos.find({ clase: "gasto" }).then(cost => { response.json(cost); });   
});

// COSTOS. Ruta para extraer datos (solo los gastos) del servidor.
app.get('/costosFijos', (request, response) => { costos.find({ clase: "costoFijo"}).then(cost => { response.json(cost); }); });
  
// COSTOS. Ruta para Guardar Cambios luego de actualizar costos.
app.post('/costos', (request, response) => {
    const costo = {
        nombre: request.body.nombre,
        idOperacion: makeid(6),
        proveedor: request.body.proveedor,
        total: request.body.total,
        fecha: request.body.fecha,
        descripcion: request.body.descripcion,
        clase: request.body.clase,
        categoria: request.body.categoria,
        tipo: "Egresos",
        fechaPrimerPago: request.body.fechaPrimerPago,
        fechaUltimoPago: request.body.fechaUltimoPago
    }
    const _id = request.body._id;
    costos.update({"_id": objectId(_id)}, {$set: costo}, {upsert:true, multi: true}).then(costosCreado => { response.json(costosCreado); });
});

// COSTOS. Ruta para eliminar costos.
app.post('/borrarCostos', (request, response) => {
    const indice = request.body.id;
    costos.remove({ "_id": objectId(indice)}).then(costosBorrado => { response.json(costosBorrado); });
});


    // PRODUCTOS. Para obtener los productos.
    app.get('/productos', (request, response) => { productos .find({}) .then(producto => { response.json(producto); } ); });

    app.get('/productsAndStock', (request, response) => {
        productos.aggregate([
            { "$lookup": {
              "from": "inventarioDePrueba",
              "localField": "sku",
              "foreignField": "sku",
              "as": "stock"
            }},
            { "$project": {
              "total": { "$sum": "$_children.cantidad" }
            }}
          ]).then(ss => { response.json(ss); });
    });


    // PRODUCTOS. Ruta obtener la lista de productos sin fotos (para que pese menos y sea más rápido).
    app.get('/productosSinFotos', (request, response) => { productos.aggregate([ {$project: { foto: 0 }} ]).then(productosSinFotos => { response.json(productosSinFotos); }); });

    // PRODUCTOS. Ruta para Guardar cambios en productos. Usamos bulkWrite para hacer el update en un solo query (para que si hay muchos elementos no haga update tantas veces). Ojo que aca reemplaza los datos, no los actualiza, asique los fields tienen que ser iguales que antes, por lo que hay riesgo de haber corrupcion de datos.
    //app.post('/updateProducts', (request, response) => { let productArray = request.body; productos.bulkWrite( productArray.map( d => ({ "replaceOne": { "filter": { "_id": d._id }, "replacement": d } })) ).then(productoCreado => { response.json(productoCreado); }); });

    // PRODUCTOS. Ruta para Guardar productos luego de agregar productos.
    app.post('/productos', (request, response) => {
        const producto = {
            product: request.body.producto,
            marca: request.body.marca,
            foto: request.body.imgURL,
            catalogo: request.body.catalogoURL,
            categoria: request.body.categoria,
            precio: request.body.precio,
            sku: request.body.sku,
            descuento: request.body.descuento,
            descripcion: request.body.descripcion,
            proveedor: request.body.proveedor,
            ultimoCosto: parseFloat(request.body.ultimoCosto)
        };
        const _id = request.body._id;
        productos.update({
            "_id": objectId(_id)
        }, {
            $set: producto
        }, {
            upsert: true,
            multi: true
        }).then(productoCreado => {
            response.json(productoCreado);
        });
    });

    //PRODUCTOS. Ruta para Guardar Cambios luego de ACTUALIZAR productos.
app.post('/updateProduct', (request, response) => {
    const prod = {
      precio: request.body.precio,
      categoria: request.body.categoria,
      descuento: request.body.descuento,
      marca: request.body.marca,
      foto: request.body.imgURL
    };
    const _id = request.body.productId;
    productos
    .update({"_id": objectId(_id)}, {$set: prod}, {upsert:true, multi: true})
    .then(productoActualizado => {
        response.json(productoActualizado);
    });
});

    //PARA ACTUALIZAR ULTIMO COSTO DE CADA PRODUCTO
    app.post('/updateProductCost', (request, response) => {

        let productArray = request.body.datosTabla;

        productos.bulkWrite(productArray.map(product => ({
            updateOne: {
                "filter": {
                    "sku": product.sku
                },
                "update" : { $set: { 'ultimoCosto': parseFloat(product.costo) } }
            }
        }))).then(costoActualizado => { response.json(costoActualizado); });
        
    });



    // PRODUCTOS. Ruta para eliminar productos. Se activa al apretar botón de "eliminar producto".
    app.post('/eliminarProducto', (request, response) => { const indice = request.body.indice; productos .remove({ "_id": objectId(indice)}) .then(productosBorrado => { response.json(productosBorrado); }); });





    //PRUEBA DE VENTAS
    app.get('/allDataSales', (request, response) => {
        
        let queryData = [];

        async function querySales() { let query = await pruebaDeVentas.find({}); queryData.push({ventas: query}); return "Done"; };
        async function queryInventory() { let query = await inventarioDePrueba.find({}); queryData.push({inventario: query}); return "Done"; };
        async function queryProducts() { let query = await productos.find({}); queryData.push({productos: query}); return "Done"; };
        async function queryClients() { let query = await clientes.find({}); queryData.push({clientes: query}); return "Done"; };
        async function queryProfile() { let query = await userProfile.find({}); queryData.push({user: query}); return "Done"; };

        queryAll();
        async function queryAll() {
            let salesQuery = await querySales();
            let inventoryQuery = await queryInventory();
            let productsQuery = await queryProducts();
            let clientsQuery = await queryClients();
            let userQuery = await queryProfile();
            if (salesQuery && inventoryQuery && productsQuery && clientsQuery && userQuery) {
                let data = Object.assign({}, ...queryData);
                response.json(data);
            } 
         };
     });



    app.get('/pruebaDeVentas', (request, response) => {
        pruebaDeVentas.find({}).then(pruebaDeVentas => { response.json(pruebaDeVentas); });
    });

    app.get('/ventasEntregadas', (request, response) => { pruebaDeVentas.find({ estado: "Entregada" }).then(data => { response.json(data); }); });
    app.get('/ventasConfirmadas', (request, response) => { pruebaDeVentas.find({ estado: "Confirmada" }).then(data => { response.json(data); }); });
    app.get('/ventasPorConfirmar', (request, response) => { pruebaDeVentas.find({ estado: "Por Confirmar" }).then(data => { response.json(data); }); });


    app.post('/querySale', (request, response) => {
        let saleID = request.body.saleID;
        pruebaDeVentas.find({ idOperacion: saleID }).then(datosVenta => { response.json(datosVenta); });  
    });

    app.post('/requestSpecificCustomer', (request, response) => {
        let customer = request.body.customer;   
        pruebaDeVentas.find({ cliente: customer }).then(ventasCliente => { response.json(ventasCliente); });  
     });

    app.post('/pruebaDeVentas', (request, response) => {
        
        let x = request.body;
        let _id = request.body._id;

        pruebaDeVentas .update(
        {"_id": objectId(_id)},
        {
            $set: {
                'tipo': "Ingresos",
                'categoria': "Ventas",
                'fecha': x.fecha,
                'fechaConfirmacion': x.fechaConfirmacion,
                'fechaEntrega': x.fechaEntrega,
                'fechaDePago': x.fechaDePago,
                'estado': x.estado,
                'costo': x.costo,
                'idOperacion': x.idOperacion,
                'total': x.total,
                'cliente': x.cliente,
                'iva': x.iva,
                'descuentos': x.descuentos,
                'comentario': x.comentario,
                'medioDePago': x.medioDePago,
                'productosVendidos': x.productosVendidos
            }
        },
        { upsert: true, multi: false }) 
        .then(venta => { response.json(venta); });
    });

    app.post('/updateSaleStatus', (request, response) => {
        let x = request.body.sale;
        let _id = x._id;
        pruebaDeVentas .update(
        {"_id": objectId(_id)},
        {
            $set: { 'estado': x.estado, 'fechaConfirmacion': x.fechaConfirmacion, 'fechaEntrega': x.fechaEntrega, }
        },
        { upsert: true, multi: false }) 
        .then(() => { response.json("Done"); });
    });

    app.post('/updateInventoryFromSales', (request, response) => {
        let productArray = request.body.productosVendidos;
        let inventoryData = []; let skuArray = [];
        productArray.forEach(i => skuArray.push(i.sku));        
        async function queryInventory() { let query = await inventarioDePrueba.find({"sku": {"$in": skuArray}}); inventoryData.push({query}); return "Done"; };
        queryAll();
        async function queryAll() {
            let inventoryQuery = await queryInventory();
            if (inventoryQuery) {
                let data = inventoryData[0].query; let result = []; let averageCost = 0;
                for (let k = 0; k < productArray.length; k++) {
                  let cantidad = productArray[k].cantidad; let remainingQuantity = cantidad;
                  for (let i = 0; i < data.length; i++) {
                    if (productArray[k].sku == data[i].sku) {
                      for (let value of data[i]._children) {
                        if (value.cantidad < remainingQuantity) { remainingQuantity = remainingQuantity - value.cantidad; averageCost = averageCost + (value.costo * value.cantidad) / cantidad; value.cantidad = 0; value.deleted = "yes"; }
                        else { if (remainingQuantity !== 0) { value.cantidad = value.cantidad - remainingQuantity; averageCost = averageCost + (value.costo * remainingQuantity) / cantidad; remainingQuantity = 0; } }
                      };
                      result.push(data[i]._children);
                    };
                  };
                };
                inventarioDePrueba.bulkWrite(result.map(arrayOfProducts => ({ updateOne: { "filter": { "sku": arrayOfProducts[0].sku }, "update" : { $set: { '_children': arrayOfProducts } } } }))).then(() => { response.json("Done"); });   
            };
         }; 
    });


    app.post('/deleteSale', (request, response) => {
        const indice = request.body.id;
        pruebaDeVentas
        .remove({ "_id": objectId(indice)})
        .then(ventasBorrado => {
            response.json(ventasBorrado);
        });
    });

   

    //Para tener las ventas sin productos vendidos
    app.get('/pruebaDeVentasSinProductos', (request, response) => { pruebaDeVentas.aggregate([ {$project: { productosVendidos: 0 }}, ]).then(pruebaDeVentas => { response.json(pruebaDeVentas); }); });

       //PRUEBA DE INVENTARIO
        app.get('/inventarioDePrueba', (request, response) => {
            inventarioDePrueba.aggregate([
                {$project: {
                    producto: 1,
                    sku: 1,
                   _children: {$filter: {
                      input: '$_children',
                      as: 'item',
                      cond: { $eq : ['$$item.deleted', "no"] }
                   }},
                }},
                { $match: { "_children.0": {  "$exists": true } } }//Con esto solo nos entrega los elementos que tienen por lo menos un "no deleted", para no corromper la tabla.
              ])
               // .find({})
                .then(inventarioDePrueba => {
                    response.json(inventarioDePrueba);
                });
        });

        app.post('/inventarioDePrueba', (request, response) => { const inv = { proveedor: request.body.proveedor, producto: request.body.producto, sku: request.body.sku, costo: request.body.costo, precio: request.body.precio, cantidad: request.body.cantidad, fecha: request.body.fecha }; const _id = request.body._id; let totalInicial = inv.costo * inv.cantidad; let cantidadInicial = inv.cantidad; async function existe() { let data = await inventarioDePrueba.count({ 'sku': inv.sku }); if (data == 0) { inventarioDePrueba .update({ "sku": inv.sku }, { $set: { 'producto': inv.producto, 'sku': inv.sku, '_children': [{ id: makeid(5), fecha: inv.fecha, proveedor: inv.proveedor, producto: inv.producto, sku: inv.sku, costo: inv.costo, cantidad: inv.cantidad, totalInicial: totalInicial, cantidadInicial: cantidadInicial, deleted: "no" }] } }, { upsert: true, multi: false }) .then(inventarioDePrueba => { response.json(inventarioDePrueba); }); } else { inventarioDePrueba .update({ "sku": inv.sku }, { $push: { _children: { id: makeid(5), fecha: inv.fecha, proveedor: inv.proveedor, producto: inv.producto, sku: inv.sku, costo: inv.costo, cantidad: inv.cantidad, cantidadInicial: cantidadInicial, totalInicial: totalInicial, deleted: "no" } } }, { upsert: true, multi: false }) .then(inventarioDePrueba => { response.json(inventarioDePrueba); }); } } existe(); });
    
        app.post('/inventarioDePruebaVentas', (request, response) => {
    
            if (request.body[0] !== undefined || null) {

                let productArray =  request.body;
                inventarioDePrueba.bulkWrite(productArray.map(d => ({
                    updateOne: {
                        "filter": {
                            "sku": d[0].sku
                        },
                        "update" : { $set: { '_children': d } }
                    }
                })))
     
            .then(inventarioCreado => { response.json(inventarioCreado); });
        }
        
        });

        app.get('/inventarioDePruebaNoDelete', (request, response) => {
            inventarioDePrueba
                .find({})
                .then(inventarioDePrueba => {
                    response.json(inventarioDePrueba);
                });
        });



        //PRUEBA DE COMPRAS
    app.get('/pruebaDeCompras', (request, response) => { pruebaDeCompras.find({ estado: "Por Confirmar" }).then(pruebaDeCompras => { response.json(pruebaDeCompras); }); });
    app.get('/comprasConfirmadas', (request, response) => { pruebaDeCompras.find({ estado: "Confirmada" }).then(pruebaDeCompras => { response.json(pruebaDeCompras); }); });
    app.get('/comprasRecibidas', (request, response) => { pruebaDeCompras.find({ estado: "Recibida" }).then(pruebaDeCompras => { response.json(pruebaDeCompras); }); });
    app.get('/comprasPorConfirmar', (request, response) => { pruebaDeCompras.find({ estado: "Por Confirmar" }).then(pruebaDeCompras => { response.json(pruebaDeCompras); }); });
    app.get('/comprasConfirmadasYRecibidas', (request, response) => { pruebaDeCompras.find({ estado: { $ne: "Por Confirmar" } }).then(pruebaDeCompras => { response.json(pruebaDeCompras); }); });

    app.post('/requestSpecificSupplier', (request, response) => {
       let supplier = request.body.supplier;    
       pruebaDeCompras.find({ proveedor: supplier }).then(datosProveedor => { response.json(datosProveedor); });  
       
       //Por si quieres la compra sin los productos comprados
       //pruebaDeCompras.aggregate([ { $project: { productosComprados: 0 } }, { $match : { proveedor : supplier } } ]).then((datosProveedor) => { response.json(datosProveedor); });
    });
  
    app.post('/queryPurchase', (request, response) => {
        let purchaseID = request.body.purchaseID;
        pruebaDeCompras.find({ idCompra: purchaseID }).then(datosCompra => { response.json(datosCompra); });  
    });
    

    app.post('/pruebaDeCompras', (request, response) => {
        
        let x = request.body.confirmedPurchase;
        let _id = x._id;

        pruebaDeCompras.update({
                "_id": objectId(_id)
            }, {
                $set: {
                    'tipo': "Egresos",
                    'categoria': "Compras",
                    'fecha': x.fecha,
                    'fechaConfirmacion': x.fechaConfirmacion,
                    'fechaReciboProductos': x.fechaReciboProductos,
                    'fechaDePago': x.fechaDePago,
                    'idCompra': x.idCompra,
                    'total': x.total,
                    'proveedor': x.proveedor,
                    'iva': x.iva,
                    'comentario': x.comentario,
                    'medioDePago': x.medioDePago,
                    'estado': x.estado,
                    'productosComprados': x.productosComprados
                }
            }, {
                upsert: true,
                multi: false
            })
            .then(compraCreada => {
                response.json(compraCreada);
            });
    });

    app.post('/deletePurchase', (request, response) => {
        const indice = request.body.id;
        pruebaDeCompras
        .remove({ "_id": objectId(indice)})
        .then(ventasBorrado => {
            response.json(ventasBorrado);
        });
    });


    app.post('/purchaseToInventory', (request, response) => {
        
        if (request.body[0] !== undefined || null) {

            let productArray =  request.body;
            let count = 0;
            updateInventory ();
            async function updateInventory () {
                for (let element of productArray) {
                let data = await inventario.count({'sku': element.sku});
                if(data == 0) { inventario .update({"sku": element.sku}, { $set: { 'producto': element.producto, 'sku': element.sku, '_children': [ {id: element.id, fecha: element.fecha, proveedor: element.proveedor, producto: element.producto, sku: element.sku, costo: element.costo, cantidad: element.cantidad, totalInicial: element.totalInicial, cantidadInicial: element.cantidadInicial, deleted: "no" } ] } }, {upsert:true, multi: false}) }
                else { inventario .update({"sku": element.sku}, { $push: { _children: {id: element.id, fecha: element.fecha, proveedor: element.proveedor, producto: element.producto, sku: element.sku, costo: element.costo, cantidad: element.cantidad, totalInicial: element.totalInicial, cantidadInicial: element.cantidadInicial, deleted: "no" } } }, {upsert:true, multi: false}) };
                count +=1;
                if (count == productArray.length) {response.json("Data Updated")};
                  };
              };
        };  
    });

    //Para pedir información de cierto SKU.
    app.post('/skuQuery', (request, response) => {
        let sku = request.body.sku;  

        let queryData = [];

        async function querySales() { let query = await pruebaDeVentas.aggregate([ { "$match": { "productosVendidos.sku" : sku } }, { "$unwind": "$productosVendidos"}, { "$match": { "productosVendidos.sku" : sku } }, { "$group": { "_id" : null, ventas: { $push:  { sku: "$productosVendidos.sku", cliente: "$cliente", fecha: "$fecha", idOperacion: "$idOperacion", total: "$productosVendidos.total" } }, }} ]); queryData.push(query); return "Done"; };
        async function queryInventory() {
            let query = await inventarioDePrueba.aggregate([{
                $match: {
                    'sku': sku
                }
            }, {
                $unwind: "$_children"
            }, {
                $group: {
                    _id: null,
                    cantidad: {
                        $sum: "$_children.cantidad"
                    },
                    proveedores: {
                        $push: {
                            proveedor: "$_children.proveedor"
                        }
                    },
                    costosYCantidades: {
                        $push: {
                            cantidad: "$_children.cantidadInicial",
                            costo: "$_children.costo"
                        }
                    }
                }
            }]);
            queryData.push(query);
            return "Done";
        };
        async function queryPurchases() { let query = await pruebaDeCompras.aggregate([{ "$match": { "productosComprados.sku": sku } }, { "$unwind": "$productosComprados" }, { "$match": { "productosComprados.sku": sku } }, { "$group": { "_id": null, compras: { $push: { sku: "$productosComprados.sku", proveedor: "$proveedor", fecha: "$fecha", idCompra: "$idCompra", total: "$productosComprados.total" } }, } }]); queryData.push(query); return "Done"; };

        queryAll();
        async function queryAll() {
            let salesQuery = await querySales();
            let inventoryQuery = await queryInventory();
            let purchasesQuery = await queryPurchases();
            if (salesQuery && inventoryQuery && purchasesQuery) {
                let noIdData = _.flattenDeep(queryData);
                noIdData.forEach(i => delete i._id);
                let skuData = Object.assign({}, ...noIdData);
                response.json(skuData);
            } 
         };
     });

     app.get('/allDataProductos', (request, response) => {
        let queryData = [];
        async function querySales() { let query = await pruebaDeVentas.find({}); queryData.push({ventas: query}); return "Done"; }; async function queryInventory() { let query = await inventarioDePrueba.find({}); queryData.push({inventario: query}); return "Done"; }; async function queryProducts() { let query = await productos.find({}); queryData.push({productos: query}); return "Done"; };
        queryAll();
        async function queryAll() { let salesQuery = await querySales(); let inventoryQuery = await queryInventory(); let productsQuery = await queryProducts(); if (salesQuery && inventoryQuery && productsQuery) { let data = Object.assign({}, ...queryData); response.json(data); } };
     });

     app.get('/allDataInventory', (request, response) => {
        
        let queryData = [];

        async function querySales() { let query = await pruebaDeVentas.find({}); queryData.push({ventas: query}); return "Done"; };
        async function queryInventory() { let query = await inventarioDePrueba.find({}); queryData.push({inventario: query}); return "Done"; };
        async function queryProducts() { let query = await productos.find({}); queryData.push({productos: query}); return "Done"; };

        queryAll();
        async function queryAll() {
            let salesQuery = await querySales();
            let inventoryQuery = await queryInventory();
            let productsQuery = await queryProducts();
            if (salesQuery && inventoryQuery && productsQuery) {
                let data = Object.assign({}, ...queryData);
                response.json(data);
            } 
         };
     });
    

        app.post('/uploadFiles', multer.single('file'), (req, res, next) => {

            if (!req.file) { res.status(400).send('No file uploaded.'); return; }
          
            //ID que se pone antes del nombre del archivo en caso que se suban archivos con el mismo nombre
            let randomID = makeid(5); 
            //Nombre original del archivo
            let photoName = req.file.originalname;
            //Nombre original del archivo sin espacios
            let noSpaceName = photoName.replace(/\s+/g, '');

            //Nombre del archivo que vamos a subir
            let fileName = `${randomID}${noSpaceName}`;
            
            // Create a new blob in the bucket and upload the file data.
            //original: const blob = bucket.file(req.file.originalname);
            const blob = bucket.file(fileName);
            const blobStream = blob.createWriteStream();
          
            blobStream.on('error', (err) => { next(err); });

            blobStream.on('finish', () => {
              // The public URL can be used to directly access the file via HTTP.
              const publicUrl = format( `https://storage.googleapis.com/${bucket.name}/${blob.name}` );
              res.json(publicUrl);
            });
          
            blobStream.end(req.file.buffer);

          });


          app.post('/deleteFiles', (req, res) => {
            let x = req.body;
            let filesForDeletion = [...Object.values(x)];
            let arrayForDeletion = [];
            filesForDeletion.forEach((o) => { arrayForDeletion.push(bucket.file(o)) });
            let count = 0;
            arrayForDeletion.forEach(async file => { await file.delete(); count +=1; if (count == filesForDeletion.length) { res.json("Files Deleted"); }; });
          });


          // PERFIL DE USUARIO. Ruta para extraer datos del servidor.
          app.get('/perfilDeUsuario', (request, response) => {
              userProfile.find({}).then(user => { response.json(user); });
          });

          // PERFIL DE USUARIO.. Ruta para Guardar Cambios en perfil.
          app.post('/perfilDeUsuario', (request, response) => {
              const user = {
                  nombreEmpresa: request.body.nombreEmpresa,
                  rutEmpresa: request.body.rutEmpresa,
                  direccionEmpresa: request.body.direccionEmpresa,
                  telefonoSecundarioEmpresa: request.body.telefonoSecundarioEmpresa,
                  telefonoEmpresa: request.body.telefonoEmpresa,
                  mailEmpresa: request.body.mailEmpresa,
                  imgURL: request.body.imgURL,
                  nombreUsuarioEmpresa: request.body.nombreUsuarioEmpresa
              };

              const _id = request.body._id;
              userProfile.update({
                  "_id": objectId(_id)
              }, {
                  $set: user
              }, {
                  upsert: true,
                  multi: true
              }).then(user => { response.json(user); });
          });        
};


// REGISTRO. Ruta para Guardar Nuevos Usuarios. Se activa al apretar botón de "Registrar". 
app.post('/registro', (request, response) => {
    const usuario = {
        username: request.body.username,
        email: request.body.email,
        password: request.body.password,
        created: new Date()
    }
    const _id = request.body._id;

    usuarios
    .update({"_id": objectId(_id)}, {$set: usuario}, {upsert:true, multi: true})
    .then(usuarioCreado => {
        response.json(usuarioCreado);
    });
});

// LOGIN. Ruta para Ingresar. Se activa al apretar botón de "login". 
app.post('/login', (request, response) => {
    const usuario = {
        email: request.body.email,
        password: request.body.password,
    }
    

    async function proof() {
        let user = await usuarios.findOne({
            email: usuario.email
        })
        
        if (user) {
            if (user.password == usuario.password) {
                userx = user.username;
                // console.log(userx);
                response.json("Permitir")
                console.log("Acceso Permitido")
                modulos();
            }
            else {
                console.log("Contraseña Equivocada")
            }
        }
        else {
            console.log("Usuario no encontrado")
        }
    }
    proof();
});


//FALTA:
//- Revisión de elementos duplicados en bases de datos
//- Optimización en cuanto a situaciones cuando por ejemplo se agrega un producto y después se apreta el botón guardar cambios (básicamente las interacciones entre bases de datos son bien jodidas, pero hacibles)
//- Ojo que es mejor (y más facil, y menos tedioso) prevenir que lamentar en situaciones como las de elementos duplicados (mejor que no se inserten elementos duplicados en lugar de andar sacandolos despues)
//- En caso de que quisieras tu hacerle el ID a cada elemento en mongoDB se puede hacer con un "random hex string generator"(hay algunos hechos con codigo y todo en codepen.io), lo cual quizás sería útil en ciertas situaciones.
//- Preocuparse de que en todos los modulos la info de cada elemento sea del mismo tipo (por ejemplo que todos los "cantidad" sean un numero y no un string). Mientras esto no esté revisado la plataforma no funcionará en su totalidad. La interacción entre modulos requiere igualdad en los tipos de datos, al mismo tiempo que se hace todo más facil, más simple, y menos tedioso.
//- En caso de que una venta se reverse devolver los productos quitados al inventario.
//- Que cuando el modal se cierre al apretar afuera suyo tambien se reseteen los datos ingresados (con todas las demas formas de cerrarlo se resetea).


//    .update({"_id": objectId(_id)}, {$set: {'cliente': invtot.cliente, 'producto': invtot.producto, 'sku': invtot.sku, 'precio': invtot.precio, 'costo': NumberDecimal(invtot.costo), 'cantidad': invtot.cantidad, 'total': NumberDecimal(invtot.total), 'utilidad': NumberDecimal(invtot.utilidad), 'fecha': invtot.fecha, 'fechaMongo': invtot.fechaMongo}}, {upsert:true, multi: true})
