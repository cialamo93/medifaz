
let fecha = moment();
const agregando = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 12000, timerProgressBar: false, });
const agregadoExitoso = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: false, });
fetch('/pene');

document.getElementById("register").addEventListener("click", (event) => {
   let nombre = document.getElementById("nombreSignUp").value;
   let mail = document.getElementById("mailSignUp").value;
   let rut = document.getElementById("rutSignUp").value;
   let password = document.getElementById("passwordSignUp").value;
   let repeatPassword = document.getElementById("repeatPasswordSignUp").value;
   let x = {nombre, mail, rut, password, repeatPassword, fecha};
   newUser();
   async function newUser() {
   const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(x) };
   let response = await fetch('/registro', options);
   let data = await response.json();
   };
});


document.getElementById("loginDoctor").addEventListener("click", (event) => {
   agregando.fire({ title: 'Verificando...' });
   let rut = document.getElementById("rutSignIn").value;
   let password = document.getElementById("passwordSignIn").value;
   let x = {rut, password};
   verifyPassword();
   async function verifyPassword() {
   const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(x) };
   let response = await fetch('/loginDoctores', options);
   let data = await response.json();
   if (data.acceso == "Permitir") { 
      console.log("Acceso Permitido"); localStorage.setItem("token", data.token);
      location.href = 'home.html'; 
   }
   else if (data.acceso == "Contraseña Equivocada") {agregadoExitoso.fire({ icon: 'error', title: 'Contraseña Equivocada' });}
   else {agregadoExitoso.fire({ icon: 'error', title: 'Usuario no encontrado' });}

   };
});


document.getElementById("regDrug").addEventListener("click", (event) => {
   var cat = localStorage.getItem('token');
   console.log(cat);

});


document.getElementById("registerDrugstore").addEventListener("click", (event) => {
   let nombre = document.getElementById("nombreSignUpDrugstore").value;
   let mail = document.getElementById("mailSignUpDrugstore").value;
   let rut = document.getElementById("rutSignUpDrugstore").value;
   let password = document.getElementById("passwordSignUpDrugstore").value;
   let repeatPassword = document.getElementById("repeatPasswordSignUpDrugstore").value;
   let x = {nombre, mail, rut, password, repeatPassword, fecha};
   newDrugstore();
   async function newDrugstore() {
   const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(x) };
   let response = await fetch('/registroFarmacia', options);
   let data = await response.json();
   if (data == "Done") {agregadoExitoso.fire({ icon: 'success', title: 'Farmacia Registrada' });}
   };
});

document.getElementById("loginDrugstore").addEventListener("click", (event) => {
   agregando.fire({ title: 'Verificando...' });
   let rut = document.getElementById("rutSignInDrugstore").value;
   let password = document.getElementById("passwordSignInDrugstore").value;
   let x = {rut, password};
   verifyPassword();
   async function verifyPassword() {
   const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(x) };
   let response = await fetch('/loginDrugstore', options);
   let data = await response.json();
   if (data == "Permitir") { console.log("Acceso Permitido"); location.href = 'drugstoreHome.html' }
   else if (data == "Contraseña Equivocada") {agregadoExitoso.fire({ icon: 'error', title: 'Contraseña Equivocada' });}
   else {agregadoExitoso.fire({ icon: 'error', title: 'Usuario no encontrado' });}

   };
});

console.log("Actualizacion Cuatro")


$('.modal').on('hidden.bs.modal', function () { $(this).find('form').trigger('reset'); });

