export function SaveSystem() {
    return {
        save: save,
        load: load,
        save_local: save_local,
        load_local: load_local
    };
}

const current_version = "0.0.0.1";

function save_local(cards) {
    localStorage.setItem("WRITER AUTOSAVE", JSON.stringify(prepare_save_data(cards), null, 4));
}

function load_local() {
    var r = localStorage.getItem("WRITER AUTOSAVE");
    if (r != undefined) {
        var j = JSON.parse(r);
        upgrade(j);
        return j;
    }
    return undefined;
}

function prepare_save_data(cards) {
    return {
        VERSION: current_version,
        CARDS: cards
    };
}

function save(cards) {
    var json = JSON.stringify(prepare_save_data(cards), null, 4);
    download(json, "writer.json", "Application/JSON");
}

function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

function load(file, onsuccess) {
    var reader = new FileReader();
    reader.onload = (e) => {
        var loaded_file = JSON.parse(reader.result);
        upgrade(loaded_file);
        onsuccess(loaded_file.CARDS);
    };
    reader.readAsText(file);
}

function upgrade(data) {
    console.log(data);

    if (data.hasOwnProperty("CARDS")) {
        for (var card of data.CARDS) {
            if (!card.hasOwnProperty('summary')) card.summary = "";
            if (!card.hasOwnProperty('prose')) card.prose = "";
            if (!card.hasOwnProperty('summary_expanded')) card.summary_expanded = true;
            if (!card.hasOwnProperty('prose_expanded')) card.prose_expanded = false;
        }
    }
    else {
        data.CARDS = [];
    }
}

