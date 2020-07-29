
$('.modal').on('hidden.bs.modal', function () { $(this).find('form').trigger('reset'); });
const agregando = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 12000, timerProgressBar: false, });
const agregadoExitoso = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: false, });

let prescriptionTable = new Tabulator("#prescriptionTable", { maxHeight: "300px", selectable: 1, tooltips: true, tooltipsHeader: true, index: "drugID", reactiveData: true, layout: "fitColumns", layoutColumnsOnNewData: true, columns: [ { field: "drugID", hozAlign: "center", sorter: "string", editor: "input", editable: false, visible: false }, { title: "Medicamento", field: "medicamento", hozAlign: "center", sorter: "string", editor: "input", editable: false, }, { title: "Fabricante", field: "fabricante", hozAlign: "center", sorter: "string", editor: "input", editable: false }, { title: "Formato", field: "formato", hozAlign: "center", sorter: "string", editor: "input", editable: false }, { title: "Dosis", field: "dosis", hozAlign: "center", sorter: "string", editor: "input", editable: false }, { title: "Cantidad", field: "cantidad", hozAlign: "center", sorter: "number", editor: "input", editable: false }, ], });

document.getElementById("searchPatientId").addEventListener("click", (event) => {
    agregando.fire({title: 'Buscando...'});
    let rut = document.getElementById("searchRUT").value;
    let x = {rut};
   searchPrescription(); 
   async function searchPrescription() {
   const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(x) };
   let response = await fetch('/searchPrescription', options);
   let data = await response.json();
   if (data.length != 0) {
       agregadoExitoso.fire({ icon: 'success', title: 'Receta Encontrada!' });
       console.log(data[0]);
       $("#prescription").modal(); 
       prescriptionTable.setData(data[0].medicamentosRecetados);
        document.getElementById("paciente-prescription").value = data[0].nombrePaciente;
        document.getElementById("medico-prescription").value = data[0].nombreDoctor;
        document.getElementById("comentario-prescription").value = data[0].comentarios;
        document.getElementById("rutPaciente-prescription").value = data[0].rutPaciente;
        document.getElementById("rutMedico-prescription").value = data[0].rutDoctor;
    }
   else {agregadoExitoso.fire({ icon: 'error', title: 'Receta No Encontrada' });}
   };
    
});