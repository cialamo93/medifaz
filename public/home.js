
const agregadoExitoso = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: false, });
$('.modal').on('hidden.bs.modal', function () { $(this).find('form').trigger('reset'); prescriptionPreviewTable.clearData();document.getElementById("paciente-prescriptionPreview").value = ""; document.getElementById("rut-prescriptionPreview").value = ""; document.getElementById("mail-prescriptionPreview").value = ""; });
$(document).ready(function () { $(this).find('form').trigger('reset');});
let addIcon = function(cell, formatterParams, onRendered){ return '<i style="color: #4284f7" class="fas fa-plus-circle"></i>'; };
let delIcon = function(cell, formatterParams, onRendered){ return '<i style="color: #fb275d" class="fas fa-minus-circle"></i>'; };
let selectedPatient;

function makeid(length) { let result = ''; let characters = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz'; let charactersLength = characters.length; for (let i = 0; i < length; i++) { result += characters.charAt(Math.floor(Math.random() * charactersLength)); }; return result; };
let idsYaAgregados = [];
let fecha = moment();

let token = localStorage.getItem('token');



document.getElementById("addPacient").addEventListener("click", (event) => {
    let paciente = document.getElementById("paciente-addPacient").value; let rut = document.getElementById("rut-addPacient").value; let comentario = document.getElementById("comentario-addPacient").value; let telefono = document.getElementById("telefono-addPacient").value; let mail = document.getElementById("mail-addPacient").value; let telefonoSecundario = document.getElementById("telefonoSecundario-addPacient").value; let direccion = document.getElementById("direccion-addPacient").value;
    let data = { paciente, rut, comentario, telefono, mail, telefonoSecundario, direccion };
    let dataAndToken = {token: token, data: data};
   newPatient();
   async function newPatient() {
       const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataAndToken) };
       let response = await fetch('/newPatient', options);
       let data = await response.json();
       if (data == "Done") { agregadoExitoso.fire({ icon: 'success', title: 'Usuario Agregado!' }); pacientTable.setData('/getPatients', {token: token}); };
   };
});

document.getElementById("addDrug").addEventListener("click", (event) => {
    let medicamento = document.getElementById("medicamento-addDrug").value;
    let fabricante = document.getElementById("fabricante-addDrug").value;
    let formato = document.getElementById("formato-addDrug").value;
    let dosis = document.getElementById("dosis-addDrug").value;
    let drugID = makeid(6);
    let data = { medicamento, fabricante, formato, dosis, drugID };
    let dataAndToken = {token: token, data: data};
    
   newDrug(); 
   async function newDrug() {
   const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataAndToken) };
   let response = await fetch('/newDrug', options);
   let data = await response.json();
   if (data == "Done") {agregadoExitoso.fire({ icon: 'success', title: 'Medicamento Agregado!' }); drugTable.setData('/getDrugs', {token: token})}
   };

});



let pacientTable = new Tabulator("#pacientTable", {
    maxHeight: "300px",
    selectable: 1,
    tooltips: true,
    tooltipsHeader: true,
    ajaxURL: '/getPatients',
    ajaxParams: {token: token},
    index: "sku",
    reactiveData: true,
    layout: "fitColumns",
    placeholder: "No se encontraron pacientes",
    layoutColumnsOnNewData: true,
    columns: [
     { title: "Nombre", field: "paciente", hozAlign: "center", sorter: "string", editor: "input", editable: false, },
     { title: "RUT", field: "rut", hozAlign: "center", sorter: "string", editor: "input", editable: false },
  ],
  rowSelected: function (row) { let x = row.getData(); selectedPatient = x; document.getElementById("paciente-infoPaciente").value = x.paciente; document.getElementById("rut-infoPaciente").value = x.rut; document.getElementById("comentario-infoPaciente").value = x.comentario; document.getElementById("telefono-infoPaciente").value = x.telefono; document.getElementById("mail-infoPaciente").value = x.mail; document.getElementById("telefonoSecundario-infoPaciente").value = x.telefonoSecundario; document.getElementById("direccion-infoPaciente").value = x.direccion; },
  });
  let pacientSearch = document.getElementById("pacientSearch");
  pacientSearch.addEventListener("keyup", function () { let filters = []; let columns = pacientTable.getColumns(); let search = pacientSearch.value; columns.forEach(function (column) { filters.push({ field: column.getField(), type: "like", value: search, }); }); pacientTable.setFilter([filters]); });



// drugs()
// async function drugs() {
//     let token = localStorage.getItem('token');
//     let x = { token };
//     const options = {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(x)
//     };
//     fetch('/pene', options);
//   //fetch('/pene');
// // let dataPacients = await fetchPacients.json();
// // if (dataPacients) {console.log("funca")} else {console.log("no funca")}
// }

let drugTable = new Tabulator("#drugTable", {
    maxHeight: "300px",
    selectable: 1,
    tooltips: true,
    tooltipsHeader: true,
    ajaxURL: '/getDrugs',
    ajaxParams:{token: token},
    index: "sku",
    reactiveData: true,
    layout: "fitColumns",
    placeholder: "No se encontraron medicamentos",
    layoutColumnsOnNewData: true,
    columns: [
     { title: "Medicamento", field: "medicamento", hozAlign: "center", sorter: "string", editor: "input", editable: false, },
     { title: "Fabricante", field: "fabricante", hozAlign: "center", sorter: "string", editor: "input", editable: false },
     { title: "Formato", field: "formato", hozAlign: "center", sorter: "string", editor: "input", editable: false },
     { title: "Dosis", field: "dosis", hozAlign: "center", sorter: "string", editor: "input", editable: false },
     {
        formatter: addIcon,
        width: 40,
        hozAlign: "center",
        cellClick: function (e, cell) { let cells = cell.getRow(); let celda = cells._row.data; if (idsYaAgregados.includes(celda.drugID)) { let prescriptionTableData = prescriptionTable.getData(); let cantidad = 0; for (let i = 0; i < prescriptionTableData.length; i++) { if (prescriptionTableData[i].drugID == celda.drugID) { cantidad = prescriptionTableData[i].cantidad + 1; } }; prescriptionTable.updateRow(celda.drugID, { cantidad: cantidad, }); } else { prescriptionTable.addRow({ medicamento: celda.medicamento, fabricante: celda.fabricante, formato: celda.formato, dosis: celda.dosis, drugID: celda.drugID, cantidad: 1 }, true); idsYaAgregados.push(celda.drugID); } }
    },
  ],
  });
  let drugSearch = document.getElementById("drugSearch");
  drugSearch.addEventListener("keyup", function () { let filters = []; let columns = drugTable.getColumns(); let search = drugSearch.value; columns.forEach(function (column) { filters.push({ field: column.getField(), type: "like", value: search, }); }); drugTable.setFilter([filters]); });


  let prescriptionTable = new Tabulator("#prescriptionTable", {
    maxHeight: "300px",
    selectable: 1,
    tooltips: true,
    tooltipsHeader: true,
    index: "drugID",
    reactiveData: true,
    layout: "fitColumns",
    placeholder: "Agrega Medicamentos",
    layoutColumnsOnNewData: true,
    columns: [
     { field: "drugID", hozAlign: "center", sorter: "string", editor: "input", editable: false, visible: false },
     { title: "Medicamento", field: "medicamento", hozAlign: "center", sorter: "string", editor: "input", editable: false, },
     { title: "Fabricante", field: "fabricante", hozAlign: "center", sorter: "string", editor: "input", editable: false },
     { title: "Formato", field: "formato", hozAlign: "center", sorter: "string", editor: "input", editable: false },
     { title: "Dosis", field: "dosis", hozAlign: "center", sorter: "string", editor: "input", editable: false },
     { title: "Cantidad", field: "cantidad", hozAlign: "center", sorter: "number", editor: "input", editable: true },
     { formatter: delIcon, width: 10, hozAlign: "center", cellDblClick: function (e, cell) { let drugID = cell.getRow()._row.data.drugID; let tableDataLength = prescriptionTable.getData().length; if (tableDataLength > 1) { prescriptionTable.deleteRow(drugID); } else { prescriptionTable.clearData(); }; idsYaAgregados = _.without(idsYaAgregados, drugID); } },
  ],
  });
  let prescriptionSearch = document.getElementById("prescriptionSearch"); prescriptionSearch.addEventListener("keyup", function () { let filters = []; let columns = prescriptionTable.getColumns(); let search = prescriptionSearch.value; columns.forEach(function (column) { filters.push({ field: column.getField(), type: "like", value: search, }); }); prescriptionTable.setFilter([filters]); });


  let prescriptionPreviewTable = new Tabulator("#prescriptionPreviewTable", {
    maxHeight: "300px",
    selectable: 1,
    tooltips: true,
    tooltipsHeader: true,
    index: "drugID",
    reactiveData: true,
    layout: "fitColumns",
    placeholder: "Agrega Medicamentos",
    layoutColumnsOnNewData: true,
    columns: [
     { field: "drugID", hozAlign: "center", sorter: "string", editor: "input", editable: false, visible: false },
     { title: "Medicamento", field: "medicamento", hozAlign: "center", sorter: "string", editor: "input", editable: false, },
     { title: "Fabricante", field: "fabricante", hozAlign: "center", sorter: "string", editor: "input", editable: false },
     { title: "Formato", field: "formato", hozAlign: "center", sorter: "string", editor: "input", editable: false },
     { title: "Dosis", field: "dosis", hozAlign: "center", sorter: "string", editor: "input", editable: false },
     { title: "Cantidad", field: "cantidad", hozAlign: "center", sorter: "number", editor: "input", editable: false },
  ],
  });

  document.getElementById("openPrescriptionPreview").addEventListener("click", (event) => {
    let data = prescriptionTable.getData();
    prescriptionPreviewTable.setData(data);
    $("#prescriptionPreview").modal();
    if (selectedPatient.paciente) {
        document.getElementById("paciente-prescriptionPreview").value = selectedPatient.paciente;
        document.getElementById("rut-prescriptionPreview").value = selectedPatient.rut;
        document.getElementById("mail-prescriptionPreview").value = selectedPatient.mail;    
    }
    prescriptionTable.clearData();
});

$('#prescriptionPreview').on('hidden.bs.modal', function () {
    selectedPatient = {};
    $(".pacienteSeleccionado").find('form').trigger('reset');
    pacientTable.deselectRow();
    prescriptionPreviewTable.clearData();
});

document.getElementById("addPrescription").addEventListener("click", (event) => {

    let medicamentosRecetados = prescriptionPreviewTable.getData();
    let comentarios = document.getElementById("comentario-prescriptionPreview").value;
    let data = { selectedPatient, medicamentosRecetados, comentarios, fecha };
    let dataAndToken = {token: token, data: data};

    newPrescription();
    async function newPrescription() {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataAndToken)
        };
        let response = await fetch('/newPrescription', options);
        let data = await response.json();
        if (data == "Done") {
            agregadoExitoso.fire({
                icon: 'success',
                title: 'Receta Agregada al Sistema!'
            });
        }
    };
 })



