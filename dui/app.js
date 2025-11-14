let ascii = `

  /$$$$$$ /$$                           /$$   /$$$$$$   /$$$$$$ 
 /$$__ $$| $$                           |__/ /$$__  $$ /$$__  $$
| $$  \__/| $$$$$$$   /$$$$$$   /$$$$$$  /$$| $$  \__/ | $$  \__/
| $$$$$$ | $$__  $$ /$$__  $$ /$$__  $$| $$| $$$$    | $$$$    
 \____  $$| $$  \  $$| $$$$$$$$| $$  \__/ | $$| $$_/    | $$_/    
 /$$  \ $$| $$  | $$| $$_____/| $$      | $$| $$      | $$      
| $$$$$$/| $$  | $$|  $$$$$$$| $$      | $$| $$      | $$      
 \______/ |__/  |__/  \_______/|__/      |__/|__/      |__/                                                                 
`

let NOT_LOGGED_PROMPT = `$ `
let loggedIn = false

let greetings = "[[g;#00ff00;]Eden Data System Terminal [Version 0.0.14979.4192]]\n"+ascii+"\n\n"

let username = undefined;
let password = undefined;
let playersData = undefined;

async function loadSavedLogin() {
    const savedUsername = localStorage.getItem('terminal_username');
    const savedPassword = localStorage.getItem('terminal_password');
    if (savedUsername && savedPassword) {
        commands.login2(savedUsername, savedPassword)
    } else {
        term.echo("\n")
        commands.help()
        term.echo("\n")
    }
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
    "1. help": "Visualizza l'elenco dei comandi con una breve descrizione.",
    "2. login": "Autenticati inserendo username e password.",
    "3. exit": "Termina la sessione del terminale ed esegui il logout.",
    "4. citizencard": "Cerca e gestisci i dati dei cittadini (visualizza, aggiungi, elimina note/record/multe).",
    "5. findanklet" : "Localizza una cavigliera",
    "6. findcar [targa]": "Localizza il veicolo tramite targa e lo evidenzia sulla mappa per 5 minuti.",
};

let commands = {
    "findanklet": async function() {
        if (!loggedIn) {
            term.error("Devi effettuare il login per eseguire questo comando, esegui `login`");
            return;
        }
        
        term.echo("[[gb;green;]Recupero la lista delle cavigliere attive...]");
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
            term.echo("Operazione annullata.");
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
            term.error("Devi effettuare il login per eseguire questo comando, esegui `login`");
            return;
        }
        plate = plate ? plate.trim() : "";
        if (!plate) {
            term.error("Devi inserire una targa valida.");
            return;
        }
        term.echo("Verifica veicolo con targa: " + plate);
        let response = await $.post(`https://peakville_sheriff-terminal/addblipbyplate`, JSON.stringify({
            plate: plate
        }));
        if (response && response.success) {
            term.echo(`[[gb;green;]Controlla la mappa per il veicolo con targa ${plate}.]`);
        } else {
            term.error("Operazione fallita: " + (response?.error || "Errore sconosciuto."));
        }
    },
    "citizencard": async function() {
        if (!loggedIn) {
            term.error("Devi effettuare il login per eseguire questo comando, esegui `login`");
            return;
        }

        if (!playersData || playersData.length <= 0) {
            term.error("Nessun dato disponibile. Assicurati di aver effettuato il login.");
            return;
        }

        let searchValue = await term.read("Inserisci il valore da cercare (0 per uscire):");
        searchValue = searchValue.trim();

        if (searchValue === "0") {
            term.echo("Operazione annullata.");
            return;
        }

        searchValue = searchValue.toLowerCase();

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

            let selectedIndex = await term.read("Inserisci il numero del cittadino per visualizzare i dettagli (0 per uscire):");
            selectedIndex = parseInt(selectedIndex, 10);

            if (selectedIndex === 0) {
                term.echo("Operazione annullata.");
                return;
            }

            selectedIndex = selectedIndex - 1;

            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= results.length) {
                term.error("Selezione non valida. Inserisci un numero valido dalla lista.");
                return;
            }

            const selectedCitizen = results[selectedIndex];
            term.clear();
            term.echo(`[[gb;green;]Dettagli Cittadino:]`);
            term.echo(`[[b;yellow;]Nome:] ${selectedCitizen.firstname || "N/A"} ${selectedCitizen.lastname || "N/A"}`);
            term.echo(`[[b;yellow;]Data di nascita:] ${selectedCitizen.date_of_birth || "N/A"}`);
            term.echo(`[[b;yellow;]Sesso:] ${selectedCitizen.gender || "N/A"}`);
            term.echo(`[[b;yellow;]Altezza:] ${selectedCitizen.height || "N/A"}`);
            term.echo(`[[b;yellow;]Peso:] ${selectedCitizen.weight || "N/A"}`);
            term.echo(`[[b;yellow;]Stato:] ${selectedCitizen.state || "N/A"}`);
            term.echo(`[[b;yellow;]Etnia:] ${selectedCitizen.ethnicity || "N/A"}`);
            term.echo(`[[b;yellow;]Taglia scarpe:] ${selectedCitizen.shoe_size || "N/A"}`);
            term.echo(`[[b;yellow;]Gruppo sanguigno:] ${selectedCitizen.blood_group || "N/A"}`);
            term.echo(`[[b;yellow;]Condanne penali:] ${selectedCitizen.criminal_convictions || "N/A"}`);
            term.echo("");

            let menuActive = true;
            while (menuActive) {
                term.echo("[[gb;green;]Opzioni aggiuntive:]");
                term.echo("1. Visualizza note");
                term.echo("2. Visualizza record penali");
                term.echo("3. Aggiungi nota");
                term.echo("4. Aggiungi record penale");
                term.echo("5. Visualizza multe");
                term.echo("6. Aggiungi multa");
                term.echo("0. Esci");

                let menuChoice = await term.read("Inserisci un'opzione (0-6):");
                menuChoice = parseInt(menuChoice, 10);

                switch (menuChoice) {
                    case 1:
                        term.clear();
                        term.echo("[[gb;green;]Note del cittadino:]");
                        if (selectedCitizen.notes && selectedCitizen.notes.length > 0) {
                            selectedCitizen.notes.forEach(note => {
                                term.echo(`[[b;yellow;]ID ${note.id}:] ${note.text}`);
                                term.echo(`[[b;yellow;]Data:] ${note.date || "N/A"}`);
                                term.echo("");
                            });

                            if (loggedIn === 2) {
                                let deleteNoteId = await term.read("Inserisci l'ID della nota da eliminare (0 per saltare):");
                                deleteNoteId = parseInt(deleteNoteId, 10);
                                if (deleteNoteId && deleteNoteId !== 0) {
                                    selectedCitizen.notes = selectedCitizen.notes.filter(note => note.id !== deleteNoteId);
                                    await $.post(`https://peakville_sheriff-terminal/deleteNote`, JSON.stringify({
                                        identifier: selectedCitizen.identifier,
                                        noteId: deleteNoteId
                                    }));
                                    term.echo("[[gb;green;]Nota eliminata con successo.]");
                                }
                            }
                        } else {
                            term.error("Nessuna nota disponibile per questo cittadino.");
                        }
                        break;

                    case 2:
                        term.clear();
                        term.echo("[[gb;green;]Record penali:]");
                        if (selectedCitizen.crimes && selectedCitizen.crimes.length > 0) {
                            selectedCitizen.crimes.forEach(crime => {
                                term.echo(`[[b;yellow;]ID ${crime.id}:] ${crime.text}`);
                                term.echo(`[[b;yellow;]Data:] ${crime.date || "N/A"}`);
                                term.echo("");
                            });

                            if (loggedIn === 2) {
                                let deleteCrimeId = await term.read("Inserisci l'ID del record penale da eliminare (0 per saltare):");
                                deleteCrimeId = parseInt(deleteCrimeId, 10);
                                if (deleteCrimeId && deleteCrimeId !== 0) {
                                    selectedCitizen.crimes = selectedCitizen.crimes.filter(crime => crime.id !== deleteCrimeId);
                                    await $.post(`https://peakville_sheriff-terminal/deleteCrime`, JSON.stringify({
                                        identifier: selectedCitizen.identifier,
                                        crimeId: deleteCrimeId
                                    }));
                                    term.echo("[[gb;green;]Record penale eliminato con successo.]");
                                }
                            }
                        } else {
                            term.error("Nessun record penale disponibile per questo cittadino.");
                        }
                        break;

                    case 3:
                        term.clear();
                        let note = await term.read("Inserisci la nota:");
                        if (note && note.trim() !== "") {
                            const newNote = {
                                id: null,
                                text: note,
                                date: null
                            };
                            let noteResp = await $.post(`https://peakville_sheriff-terminal/insertNote`, JSON.stringify({
                                identifier: selectedCitizen.identifier,
                                note: newNote.text
                            }));
                            if (noteResp.success) {
                                newNote.id = noteResp.id;
                                newNote.date = noteResp.date;
                                if (!selectedCitizen.notes) {
                                    selectedCitizen.notes = [];
                                }
                                selectedCitizen.notes.push(newNote);
                                term.echo("[[gb;green;]Nota aggiunta correttamente.]");
                            } else {
                                term.error("Errore nell'inserimento della nota.");
                            }
                        }
                        break;
                    
                    case 4:
                        term.clear();
                        let crime = await term.read("Inserisci il record penale:");
                        if (crime && crime.trim() !== "") {
                            const newCrime = {
                                id: null,
                                text: crime,
                                date: null
                            };
                            let crimeResp = await $.post(`https://peakville_sheriff-terminal/insertCrime`, JSON.stringify({
                                identifier: selectedCitizen.identifier,
                                record: newCrime.text
                            }));
                            if (crimeResp.success) {
                                newCrime.id = crimeResp.id;
                                newCrime.date = crimeResp.date;
                                if (!selectedCitizen.crimes) {
                                    selectedCitizen.crimes = [];
                                }
                                selectedCitizen.crimes.push(newCrime);
                                term.echo("[[gb;green;]Record penale aggiunto correttamente.]");
                            } else {
                                term.error("Errore nell'inserimento del record penale.");
                            }
                        }
                        break;
                    
                    case 5:
                        term.clear();
                        term.echo("[[gb;green;]Multe del cittadino:]");
                        if (selectedCitizen.fines && selectedCitizen.fines.length > 0) {
                            selectedCitizen.fines.forEach(fine => {
                                term.echo(`[[b;yellow;]ID ${fine.id}:] $${fine.amount}`);
                                term.echo(`[[b;yellow;]Motivo:] ${fine.reason}`);
                                term.echo(`[[b;yellow;]Status:] ${fine.status || "N/A"}`);
                                term.echo(`[[b;yellow;]Data:] ${fine.date || "N/A"}`);
                                term.echo("");
                            });
                            let message = "Inserisci 0 per uscire, 1 per segnare una multa come pagata"
                            if (loggedIn === 2) {
                                message = message + ", 2 per eliminare la multa"
                            }
                            message = message + ": "
                            let choiche = await term.read(message);
                            choiche = parseInt(choiche, 10);
                            switch (choiche) {
                                case 1:
                                    let updateFineId = await term.read("Inserisci l'ID della multa da segnare come pagata (0 per saltare):");
                                    updateFineId = parseInt(updateFineId, 10);
                                    if (updateFineId && updateFineId !== 0) {
                                        selectedCitizen.fines.find(fine => fine.id === updateFineId).status = "Pagata";
                                        await $.post(`https://peakville_sheriff-terminal/flagfinepayd`, JSON.stringify({
                                            fineId: updateFineId
                                        }));
                                        term.echo("[[gb;green;]Multa modificata con successo.]");
                                    }
                                break;
                                case 2:
                                    if (loggedIn === 2) {
                                        let deleteFineId = await term.read("Inserisci l'ID della multa da eliminare (0 per saltare):");
                                        deleteFineId = parseInt(deleteFineId, 10);
                                        if (deleteFineId && deleteFineId !== 0) {
                                            selectedCitizen.fines = selectedCitizen.fines.filter(fine => fine.id !== deleteFineId);
                                            await $.post(`https://peakville_sheriff-terminal/deleteFine`, JSON.stringify({
                                                fineId: deleteFineId
                                            }));
                                            term.echo("[[gb;green;]Multa eliminata con successo.]");
                                        }
                                    }
                                break;
                            }
                        }

                    case 6:
                        term.clear();
                        let amount = await term.read("Inserisci l'importo della multa (0 per annullare):");
                        amount = parseInt(amount, 10);

                        if (amount === 0 || isNaN(amount)) {
                            term.echo("Operazione annullata.");
                            break;
                        }

                        let reason = await term.read("Inserisci la motivazione della multa:");
                        reason = reason.trim();

                        if (!reason) {
                            term.error("Motivazione non valida.");
                            break;
                        }

                        term.echo("[[gb;green;]Invio multa in corso...]");
                        let fineResp = await $.post(`https://peakville_sheriff-terminal/insertFine`, JSON.stringify({
                            identifier: selectedCitizen.identifier,
                            amount: amount,
                            reason: reason,
                            firstname: selectedCitizen.firstname,
                            lastname: selectedCitizen.lastname
                        }));

                        if (fineResp && fineResp.success) {
                            const newFine = {
                                id: fineResp.id,
                                amount: amount,
                                reason: reason,
                                date: fineResp.date
                            };
                            if (!selectedCitizen.fines) {
                                selectedCitizen.fines = [];
                            }
                            selectedCitizen.fines.push(newFine);
                            term.echo(`[[gb;green;]Multa di $${amount} inserita con successo.]`);
                        } else {
                            term.error("Errore nell'inserimento della multa: " + (fineResp?.error || "Errore sconosciuto."));
                        }
                        break;

                    case 0:
                        menuActive = false;
                        break;

                    default:
                        term.error("Opzione non valida. Inserisci un numero valido.");
                        break;
                }
            }
        }
    },

    "switchpower": async function(time) {
        if (!loggedIn) {term.error("Devi effettuare il login per eseguire questo comando, esegui `login`"); return}
        time = parseInt(time)

        if (time > 120 || time <= 0 || isNaN(time)) {
            term.error("[Range] Range errato, valori accettati sono (0 < x <= 120)")
            return
        }

        let prompt = term.get_prompt()
        term.pause(true)
        term.echo("[[gb;green;]Download hosts.txt da ARPANET (NIC)]")
        await createProgressBar(30)
        term.echo("[[gb;green;]Stabilendo connessioni NCP]")
        term.echo("[[gb;green;]Risposta da power_plant_PK1432:]")
        term.echo("[[gb;green;]"+JSON.stringify({
            ack: Math.floor(randomRange(-100000, 1000000)), 
            pipelineId: "0x"+Math.floor(randomRange(10000, 16777215)).toString(16), 
            remote: true, 
            executionStack: "0x"+Math.floor(randomRange(10000, 16777215)).toString(16) + " => " + "0x"+Math.floor(randomRange(10000, 16777215)).toString(16) + " => "+"0x"+Math.floor(randomRange(10000, 16777215)).toString(16),
            executionFlags: "(0x001 << 5) | (0x001 << 10) | (0x001 << 0x34d)",
            async: true,
            machineId: "0x"+Math.floor(randomRange(10000, 16777215)).toString(16)
        })+"]")

        term.echo("[[gb;green;]Elaborazione...]")
        await createProgressBar(40)
        term.echo("[[gb;green;]Alimentazione commutata con successo]")
        term.echo("")
        term.set_prompt(prompt)

        $.post(`https://peakville_sheriff-terminal/blackout`, JSON.stringify({
            duration: time
        }))
        term.resume()
    },

    "help": function() {
        term.echo("Lista dei comandi disponibile: \n\n")
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
            term.echo(`Benvenuto ${username}!`)
            loggedIn = res;
            saveLogin(username, password);
        } else {
            term.error("Username o password errati!")
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
            term.echo(`Benvenuto ${username}!`)
            loggedIn = res;
            saveLogin(username, password);
        } else {
            loggedIn = false;
            term.set_prompt(NOT_LOGGED_PROMPT)
            term.echo("\n")
            commands.help()
            term.echo("\n")
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
        if (!loggedIn) {term.error("Devi effettuare il login per eseguire questo comando, esegui `login`"); return}
        if (loggedIn != 2) {term.error("Non autorizzato"); return}
        let prompt = term.get_prompt()
        await createProgressBar(50)
        term.set_prompt(prompt)
        $.post(`https://peakville_sheriff-terminal/announcement`, JSON.stringify({}))
    },

    "quit": function() {commands.exit()},
    "1": function() {commands.help()},
    "2": function() {commands.login()},
    "3": function() {commands.exit()},
    "4": function() {commands.citizencard()},
    "5": function() {commands.findanklet()},
    "6": function() {commands.findcar()},
}

function getKeyCode(key) {
    const mapping = {
        "enter": 13,
        "backspace": 8,
        "space": 32,
        "arrowup": 38,
        "arrowdown": 40,
        "arrowleft": 37,
        "arrowright": 39
    };
    if (mapping[key.toLowerCase()]) {
        return mapping[key.toLowerCase()];
    }
    if (key.length === 1) {
        return key.charCodeAt(0);
    }
    return 0;
}

var term = $('#terminal').terminal(commands, {
    greetings: greetings,
    prompt: NOT_LOGGED_PROMPT,
    history: true,
    onInit: function() {
        var cmd = this.cmd();
        var keymap = cmd.keymap();
        delete keymap['CTRL+R'];
    },
    keydown: function(event, terminal) {
        const allowedSpecialKeys = ["enter", "space", "backspace", "arrowup", "arrowdown", "arrowleft", "arrowright"];
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

term.echo("Autologin...\n")
loadSavedLogin()
if (!loggedIn) commands.help()