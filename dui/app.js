let ascii = `

  /$$$$$$ /$$                           /$$   /$$$$$$   /$$$$$$ 
 /$$__ $$| $$                           |__/ /$$__  $$ /$$__  $$
| $$  \__/| $$$$$$$   /$$$$$$   /$$$$$$  /$$| $$  \__/ | $$  \__/
| $$$$$$ | $$__  $$ /$$__  $$ /$$__  $$| $$| $$$$    | $$$$    
 \____  $$| $$  \  $$| $$$$$$$$| $$  \__/ | $$| $$_/    | $$_/    
 /$$  \ $$| $$  | $$| $$_____/| $$      | $$| $$      | $$      
| $$$$$$/| $$  | $$|  $$$$$$$| $$      | $$| $$      | $$      
 \______/ |__/  |__/  \_______/|__/      |__/|__/      |__/                                                                 
                                            

> Digitare 'help' per l'elenco dei comandi.`

let NOT_LOGGED_PROMPT = `$ `
let loggedIn = false

let greetings = "[[g;#00ff00;]Eden Data System Terminal [Version 0.0.14979.4192]]\n"+ascii+"\n\n"

let username = undefined;
let password = undefined;
let playersData = undefined;

async function loadSavedLogin() {
    const savedUsername = localStorage.getItem('terminal_username');
    const savedPassword = localStorage.getItem('terminal_password');
    commands.login2(savedUsername, savedPassword)
}

function saveLogin(user, password) {
    localStorage.setItem('terminal_username', user);
    localStorage.setItem('terminal_password', password);
}

async function AskLuaIfItsCorrect(username, password) {
    let data = await $.post(`https://peakville_sheriff-terminal/login`, JSON.stringify({
        username: username,
        password: password
    }))
    return data.correct
}

function progressBar(progress, width) {
    progress = Math.min(1, Math.max(0, progress));
    const wholeWidth = Math.floor(progress * width);
    const remainderWidth = (progress * width) % 1;
    const partWidth = Math.floor(remainderWidth * 7);

    const partChar = [" ", "▏", "▎", "▍", "▋", "▊", "▉"][partWidth];

    var line = "[" + "█".repeat(wholeWidth) + partChar + " ".repeat(width - wholeWidth) + "]";
    if (width - wholeWidth < 0) {
        line = "[" + "█".repeat(wholeWidth) + "]";
    }

    return line;
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

async function createProgressBar(step = 50) {
    var p = new Promise(resolve => {
        let progress = 0
        var interval = setInterval(function() {
            if (progress >= 1.0) {
                clearInterval(interval)
                resolve(true)
                return
            }
    
            progress += 0.01
            term.set_prompt(progressBar(progress, 10) + " "+(Math.floor(progress*100))+" %  ")
        }, step)
    })
    
    await p;
}

let commandsHelp = {
    "findanklet" : "Localizza una cavigliera",
    "findcar [plate]": "Localizza il veicolo tramite targa e lo evidenzia sulla mappa per 5 minuti.",
    "citizencard": "Cerca e gestisci i dati dei cittadini (visualizza, aggiungi, elimina note/record).",
    "switchpower [time]": "Attiva o disattiva l'alimentazione per un periodo specificato (1-120 secondi).",
    "togglealarm": "Attiva l'allarme della stazione degli sceriffi (solo per admin).",
    "login": "Autenticati inserendo username e password.",
    "exit/quit": "Termina la sessione del terminale ed esegui il logout.",
    "help": "Visualizza l'elenco dei comandi con una breve descrizione."
};

let commands = {
    "findanklet": async function() {
        if (!loggedIn) {
            term.error("Devi effettuare il login per eseguire questo comando, esegui `login`");
            return;
        }
        
        term.echo("[[gb;green;]Recupero la lista delle cavgliere attive...]");
        let anklets = await $.get(`https://peakville_sheriff-terminal/getAnklets`);
        if (!anklets || Object.keys(anklets).length === 0) {
            term.error("Nessuna cavigliera trovata.");
            return;
        }
        
        let ankletEntries = Object.entries(anklets);
        
        term.echo("[[gb;green;]Lista delle cavigliere attive:]");
        ankletEntries.forEach((entry, index) => {
            term.echo(`${index + 1}. ${entry[1]}`);
        });
        
        let input = await term.read("Inserisci il numero dell'indice per localizzare (0 per uscire):");
        let choice = parseInt(input, 10);
        if (isNaN(choice)) {
            term.error("Input non valido.");
            return;
        }
        
        if (choice === 0) {
            term.echo("Uscita dalla localizzazione.");
            return;
        }
        
        if (choice < 1 || choice > ankletEntries.length) {
            term.error("Indice non valido.");
            return;
        }
        
        let selectedId = ankletEntries[choice - 1][0];
        let name = ankletEntries[choice - 1][1];
        term.echo(`[[gb;green;]Localizzazione della cavigliera: ${selectedId}]`);
        
        let response = await $.post(`https://peakville_sheriff-terminal/localizePlayer`, JSON.stringify({
            ankletId: selectedId,
            name: name
        }));
        
        if (response && response.success) {
            term.echo(`[[gb;green;]Cavigliera localizzata con successo.]`);
        } else {
            term.error("Operazione fallita: " + (response?.error || "Errore sconosciuto."));
        }
    },
    "findcar": async function(plate) {
        if (!loggedIn) {
            term.error("You must be logged in to execute that command, run `login`");
            return;
        }
        plate = plate.trim();
        if (!plate) {
            term.error("You must enter a valid license plate.");
            return;
        }
        term.echo("Verifying vehicle with license plate: " + plate);
        let response = await $.post(`https://peakville_sheriff-terminal/addblipbyplate`, JSON.stringify({
            plate: plate
        }));
        if (response && response.success) {
            term.echo(`[[gb;green;]Look map for vehicle with plate ${plate}.]`);
        } else {
            term.error("Operation failed: " + (response?.error || "Unknown error."));
        }
    },
    "citizencard": async function() {
        if (!loggedIn) {
            term.error("You must be logged in to execute that command, run `login`");
            return;
        }

        if (!playersData || playersData.length <= 0) {
            term.error("No player data available. Please make sure you are logged in and data is loaded.");
            return;
        }

        let searchValue = await term.read("Inserisci il valore da cercare:");
        searchValue = searchValue.trim().toLowerCase();

        if (!searchValue) {
            term.error("Inserisci un valore valido per la ricerca.");
            return;
        }

        let results = playersData.filter(player => {
            return Object.entries(player).some(([key, value]) => {
                if (value === null || value === undefined) return false;
                if (Array.isArray(value)) return false;
                if (typeof value === 'object') return false;
                return String(value).toLowerCase().includes(searchValue);
            });
        });

        if (results.length === 0) {
            term.error(`Nessun risultato trovato per "${searchValue}"`);
        } else {
            term.echo(`[[gb;green;]Trovati ${results.length} risultato/i:]`);
            results.forEach((player, index) => {
                term.echo(`[[b;yellow;]${index + 1}.] ${player.firstname} ${player.lastname}`);
            });

            let selectedIndex = await term.read("Inserisci il numero del cittadino per visualizzare i dettagli:");
            selectedIndex = parseInt(selectedIndex, 10) - 1;

            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= results.length) {
                term.error("Selezione non valida. Inserisci un numero valido dalla lista.");
                return;
            }

            const selectedCitizen = results[selectedIndex];
            term.clear();
            term.echo(`[[gb;green;]Dettagli Cittadino:]`);
            term.echo(`[[b;yellow;]Name:] ${selectedCitizen.firstname || "N/A"} ${selectedCitizen.lastname || "N/A"}`);
            term.echo(`[[b;yellow;]Date of Birth:] ${selectedCitizen.date_of_birth || "N/A"}`);
            term.echo(`[[b;yellow;]Gender:] ${selectedCitizen.gender || "N/A"}`);
            term.echo(`[[b;yellow;]Height:] ${selectedCitizen.height || "N/A"}`);
            term.echo(`[[b;yellow;]Weight:] ${selectedCitizen.weight || "N/A"}`);
            term.echo(`[[b;yellow;]State:] ${selectedCitizen.state || "N/A"}`);
            term.echo(`[[b;yellow;]Ethnicity:] ${selectedCitizen.ethnicity || "N/A"}`);
            term.echo(`[[b;yellow;]Shoe Size:] ${selectedCitizen.shoe_size || "N/A"}`);
            term.echo(`[[b;yellow;]Blood Group:] ${selectedCitizen.blood_group || "N/A"}`);
            term.echo(`[[b;yellow;]Criminal Convictions:] ${selectedCitizen.criminal_convictions || "N/A"}`);
            term.echo("");

            let menuActive = true;
            while (menuActive) {
                term.echo("[[gb;green;]Additional Options:]");
                term.echo("1. View Notes");
                term.echo("2. View Crime Records");
                term.echo("3. Add Notes");
                term.echo("4. Add Crime Records");
                term.echo("5. Exit");

                let menuChoice = await term.read("Enter an option (1-5):");
                menuChoice = parseInt(menuChoice, 10);

                switch (menuChoice) {
                    case 1:
                        term.clear();
                        term.echo("[[gb;green;]Citizen Notes:]");
                        if (selectedCitizen.notes && selectedCitizen.notes.length > 0) {
                            selectedCitizen.notes.forEach(note => {
                                term.echo(`[[b;yellow;]ID ${note.id}:] ${note.text}`);
                                term.echo("");
                            });

                            if (loggedIn === 2) {
                                let deleteNoteId = await term.read("Enter the ID of the note to delete (or press Space and Enter to skip):");
                                if (deleteNoteId) {
                                    const noteId = parseInt(deleteNoteId, 10);
                                    selectedCitizen.notes = selectedCitizen.notes.filter(note => note.id !== noteId);
                                    await $.post(`https://peakville_sheriff-terminal/deleteNote`, JSON.stringify({
                                        identifier: selectedCitizen.identifier,
                                        noteId: noteId
                                    }));
                                    term.echo("[[gb;green;]Note deleted successfully.]");
                                }
                            }
                        } else {
                            term.error("No notes available for this citizen.");
                        }
                        break;

                    case 2:
                        term.clear();
                        term.echo("[[gb;green;]Crime Records:]");
                        if (selectedCitizen.crimes && selectedCitizen.crimes.length > 0) {
                            selectedCitizen.crimes.forEach(crime => {
                                term.echo(`[[b;yellow;]ID ${crime.id}:] ${crime.text}`);
                                term.echo("");
                            });

                            if (loggedIn === 2) {
                                let deleteCrimeId = await term.read("Enter the ID of the crime record to delete (or press Space and Enter to skip):");
                                if (deleteCrimeId) {
                                    const crimeId = parseInt(deleteCrimeId, 10);
                                    selectedCitizen.crimes = selectedCitizen.crimes.filter(crime => crime.id !== crimeId);
                                    await $.post(`https://peakville_sheriff-terminal/deleteCrime`, JSON.stringify({
                                        identifier: selectedCitizen.identifier,
                                        crimeId: crimeId
                                    }));
                                    term.echo("[[gb;green;]Crime record deleted successfully.]");
                                }
                            }
                        } else {
                            term.error("No crime records available for this citizen.");
                        }
                        break;

                        case 3:
                        term.clear();
                        let note = await term.read("Enter note:");
                        const newNote = {
                            id: null,
                            text: note
                        };
                        let noteResp = await $.post(`https://peakville_sheriff-terminal/insertNote`, JSON.stringify({
                            identifier: selectedCitizen.identifier,
                            note: newNote.text
                        }));
                        if (noteResp.success) {
                            newNote.id = noteResp.id;
                            if (!selectedCitizen.notes) {
                                selectedCitizen.notes = [];
                            }
                            selectedCitizen.notes.push(newNote);
                            term.echo("[[gb;green;]Note aggiunta correttamente.]");
                        } else {
                            term.error("Errore nell'inserimento della nota.");
                        }
                        break;
                    
                    case 4:
                        term.clear();
                        let crime = await term.read("Enter crime record:");
                        const newCrime = {
                            id: null,
                            text: crime
                        };
                        let crimeResp = await $.post(`https://peakville_sheriff-terminal/insertCrime`, JSON.stringify({
                            identifier: selectedCitizen.identifier,
                            record: newCrime.text
                        }));
                        if (crimeResp.success) {
                            newCrime.id = crimeResp.id;
                            if (!selectedCitizen.crimes) {
                                selectedCitizen.crimes = [];
                            }
                            selectedCitizen.crimes.push(newCrime);
                            term.echo("[[gb;green;]Record di reato aggiunto correttamente.]");
                        } else {
                            term.error("Errore nell'inserimento del record di reato.");
                        }
                        break;
                    case 5:
                        menuActive = false;
                        break;

                    default:
                        term.error("Invalid option. Please select a valid number.");
                        break;
                }
            }
        }
    },

    "switchpower": async function(time) {
        if (!loggedIn) {term.error("You must be logged in to execute that command, run `login`"); return}
        time = parseInt(time)

        if (time > 120 || time <= 0 || isNaN(time)) {
            term.error("[Range] Wrong range, accepted time values are (0 < x <= 60) [0-60]")
            return
        }

        let prompt = term.get_prompt()
        term.pause(true)
        term.echo("[[gb;green;]Downloading hosts.txt from ARPANET (NIC)]")
        await createProgressBar(30)
        term.echo("[[gb;green;]Estabilishing NCP connections]")
        term.echo("[[gb;green;]Response from power_plant_PK1432:]")
        term.echo("[[gb;green;]"+JSON.stringify({
            ack: Math.floor(randomRange(-100000, 1000000)), 
            pipelineId: "0x"+Math.floor(randomRange(10000, 16777215)).toString(16), 
            remote: true, 
            executionStack: "0x"+Math.floor(randomRange(10000, 16777215)).toString(16) + " => " + "0x"+Math.floor(randomRange(10000, 16777215)).toString(16) + " => "+"0x"+Math.floor(randomRange(10000, 16777215)).toString(16),
            executionFlags: "(0x001 << 5) | (0x001 << 10) | (0x001 << 0x34d)",
            async: true,
            machineId: "0x"+Math.floor(randomRange(10000, 16777215)).toString(16)
        })+"]")

        term.echo("[[gb;green;]Processing...]")
        await createProgressBar(40)
        term.echo("[[gb;green;]Power switched successfully]")
        term.echo("")
        term.set_prompt(prompt)

        $.post(`https://peakville_sheriff-terminal/blackout`, JSON.stringify({
            duration: time
        }))
        term.resume()
    },

    "help": function() {
        for (const [command, description] of Object.entries(commandsHelp)) {
            if (description.length > 60) {
                let splittedDescription = description.match(/.{1,55}/g)
    
                for (let key in splittedDescription) {
                    if (key > 0) {
                        splittedDescription[key] = (" ".repeat(20)) + splittedDescription[key]
                    }
                }

                term.echo(command.padEnd(20) + splittedDescription.join("\n"))
            } else {
                term.echo(command.padEnd(20) + description)
            }

        }
    },

    "login": async function() {
        username = undefined
        password = undefined
        term.set_prompt("")
        if (!username && !password) {
            username = await term.read("Username:")
            password = await term.set_mask("*").read("Password:")
            term.set_mask(false)
        }
        const res = await AskLuaIfItsCorrect(username, password)
        if (res != 0) {
            playersData = await $.get(`https://peakville_sheriff-terminal/getPlayersData`)
            term.set_prompt(`[[g;red;]peakville@${username}]:[[;#8080ff;]~]$ `)
            term.clear()
            var cmd = term.cmd();
            var keymap = cmd.keymap();
            delete keymap['CTRL+R'];
            term.echo(greetings)
            term.echo(`Welcome ${username}!`)
            loggedIn = res;
            saveLogin(username, password);
        } else {
            term.error("Incorrect username or password!")
            loggedIn = false;
            term.set_prompt(NOT_LOGGED_PROMPT)
        }
    },

    "login2": async function(username, password) {
        username = username
        password = password
        term.set_prompt("")
        const res = await AskLuaIfItsCorrect(username, password)
        if (res != 0) {
            playersData = await $.get(`https://peakville_sheriff-terminal/getPlayersData`)
            term.set_prompt(`[[g;red;]peakville@${username}]:[[;#8080ff;]~]$ `)
            term.clear()
            var cmd = term.cmd();
            var keymap = cmd.keymap();
            delete keymap['CTRL+R'];
            term.echo(greetings)
            term.echo(`Welcome ${username}!`)
            loggedIn = res;
            saveLogin(username, password);
        } else {
            term.error("Incorrect username or password!")
            loggedIn = false;
            term.set_prompt(NOT_LOGGED_PROMPT)
        }
    },

    "exit": function() {
        term.clear()
        var cmd = term.cmd();
        var keymap = cmd.keymap();
        delete keymap['CTRL+R'];
        term.echo(greetings)
        term.set_prompt(NOT_LOGGED_PROMPT)
        $.post(`https://peakville_sheriff-terminal/exit`, JSON.stringify({}))
    },

    "togglealarm": async function() {
        if (!loggedIn) {term.error("You must be logged in to execute that command, run `login`"); return}
        if (loggedIn != 2) {term.error("Not Allowed`"); return}
        let prompt = term.get_prompt()
        await createProgressBar(50)
        term.set_prompt(prompt)
        $.post(`https://peakville_sheriff-terminal/announcement`, JSON.stringify({}))
    },

    "quit": function() {commands.exit()},
}

function getKeyCode(key) {
    const mapping = {
        "enter": 13,
        "backspace": 8,
        "space": 32
    };
    if (mapping[key]) {
        return mapping[key];
    }
    if (key.length === 1) {
        return key.charCodeAt(0);
    }
    return 0;
}

var term = $('#terminal').terminal(commands, {
    greetings: greetings,
    prompt: NOT_LOGGED_PROMPT,
    onInit: function() {
        var cmd = this.cmd();
        var keymap = cmd.keymap();
        delete keymap['CTRL+R'];
    },
    keydown: function(event, terminal) {
        const allowedSpecialKeys = ["enter", "space", "backspace"];
        if (allowedSpecialKeys.includes(event.key.toLowerCase())) {
            return;
        }
        if (event.key.length > 1) {
            return false;
        }
    }
});

$.terminal.syntax('javascript');

window.addEventListener("message", (e) => {
    let data = e.data;
    if (data.type === "keyPress") {
        let key = data.key;
        let keyCode = getKeyCode(key);

        if (key.length > 1) {
            let evt = $.Event("keydown", { 
                key: key, 
                which: keyCode, 
                charCode: keyCode 
            });
            $('#terminal').trigger(evt);
        } else {
            let evt = $.Event("keypress", { 
                key: key, 
                which: keyCode, 
                charCode: keyCode 
            });
            $('#terminal').trigger(evt);
        }
    }
});

loadSavedLogin()