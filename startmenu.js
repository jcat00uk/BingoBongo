const toggleNightMode = document.getElementById('toggleNightMode');

let nightMode = false;

// Load saved preference
if(localStorage.getItem('startmenu_nightMode')==='true'){
  nightMode = true;
  document.body.classList.add('night-mode');
  toggleNightMode.checked = true;
}

// Toggle event
toggleNightMode.addEventListener('change', () => {
  nightMode = toggleNightMode.checked;
  document.body.classList.toggle('night-mode', nightMode);
  localStorage.setItem('startmenu_nightMode', nightMode);
});
