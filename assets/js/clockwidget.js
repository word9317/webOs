function updateclockwidget(){
    const clockWidget = document.getElementById('clock');
    const timeNow = new Date();
    
    //reformat the time
    const hours = String(timeNow.getHours()).padStart(2, '0');
    const minutes = String(timeNow.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    // reformat the date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = timeNow.toLocaleDateString('en-US', dateOptions);
    
    // combine into one text and set clockwidget to it
    clockWidget.textContent = `${timeString}  \u00A0\u00A0\u00A0 ${dateString}`;
}

// run the function immediately so the clock isn't blank for the first second
updateclockwidget();

// update it every second
setInterval(updateclockwidget, 1000);