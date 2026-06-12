//Get the elements
const textarea = document.getElementById('notepad');
const statustext = document.getElementById('status');
const savebutton = document.getElementById('savebutton');

//Get saved text from localstorage
const saveddata = localStorage.getItem('scratchpadsaved');

function savedata(){
    console.log('shgould save data')
    localStorage.setItem('scratchpadsaved', textarea.value);
}

//Function to check whether the text is saved or not and change text
function checksaved(){
    if (localStorage.getItem('scratchpadsaved') !== textarea.value){
        console.log('notsaved');
        statustext.innerText = "Careful, your work isn't saved"
    } else {
        statustext.innerText = "Your work is saved"
    }
}


//Check if saveddata is null before setting textarea's text
if (saveddata !== null){
    textarea.value = saveddata;
}
//Function to save text data

savebutton.addEventListener("click", function(){
    console.log('saving data...');
    savedata();
    checksaved();
});

textarea.addEventListener("input", function(){
    checksaved();
});
checksaved();