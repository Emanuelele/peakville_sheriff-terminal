ESX = exports["es_extended"]:getSharedObject()
xSound = exports["xsound"]
CDN = exports["peakville_cdn"]

loggedIn = {}

function unixToDateString(msTimestamp)
    local timestamp = math.floor(msTimestamp / 1000)
    local t = os.date("*t", timestamp)
    return string.format("%02d/%02d/%04d", t.day, t.month, t.year)
end

ESX.RegisterServerCallback("Peakville:Terminal:Login", function(source, cb, username, password)
    local src = source
    local result = (username == "sheriff" and password == "amendment") and 1
                or (username == "sheriff" and password == "roscoe") and 2
                or 0
    if result ~= 0 then
        loggedIn[src] = result
    end
    cb(result)
end)

RegisterNetEvent("Peakville:Terminal:BankOpenShutters", function()
    if loggedIn[src] then
        TriggerClientEvent("Peakville:Bank:ForceOpenSecurityShutters", -1)
    end
end)

local announcementStarted = false
RegisterNetEvent("Peakville:Terminal:ToggleAnnouncement", function()
    local src = source
    if loggedIn[src] == 2 then
        announcementStarted = not announcementStarted

        if announcementStarted then
            xSound:PlayUrlPos(-1, "sheriff_announcement", CDN:GetStaticUrl("terminal/blackout_siren.ogg"), 0.6, vec3(-443.9271, 6003.2588, 44.6044), true)
            xSound:Distance(-1, "sheriff_announcement", 1000.0)
        else
            xSound:Destroy(-1, "sheriff_announcement")
        end
    end
end)

ESX.RegisterServerCallback("Peakville:Terminal:GetPlayersData", function(source, cb)
    local src = source
    if loggedIn[src] then
        local users = MySQL.query.await("SELECT identifier, firstname, lastname, dateofbirth, sex, height, weight, ethnicity, state, shoe_size, blood_group, criminal_convictions FROM users")
        local crimeRecords = MySQL.query.await("SELECT id, identifier, record, date FROM crime_records")
        local citizenNotes = MySQL.query.await("SELECT id, identifier, note, date FROM citizen_notes")
        local fines = MySQL.query.await("SELECT id, identifier, amount, reason, status, date FROM citizen_fines")

        local playersData = {}

        for _, user in pairs(users) do
            local crimes = {}
            for _, crime in pairs(crimeRecords) do
                if crime.identifier == user.identifier then
                    table.insert(crimes, { id = crime.id, text = crime.record, date = unixToDateString(crime.date) })
                end
            end

            local notes = {}
            for _, note in pairs(citizenNotes) do
                if note.identifier == user.identifier then
                    table.insert(notes, { id = note.id, text = note.note, date = unixToDateString(note.date) })
                end
            end

            local citizenFines = {}
            for _, fine in pairs(fines) do
                if fine.identifier == user.identifier then
                    table.insert(citizenFines, { id = fine.id, amount = fine.amount, reason = fine.reason, date = unixToDateString(fine.date), status = fine.status })
                end
            end

            table.insert(playersData, {
                identifier = user.identifier,
                firstname = user.firstname,
                lastname = user.lastname,
                date_of_birth = user.dateofbirth,
                gender = user.sex,
                height = user.height,
                weight = user.weight,
                ethnicity = user.ethnicity,
                state = user.state,
                shoe_size = user.shoe_size,
                blood_group = user.blood_group,
                criminal_convictions = user.criminal_convictions,
                crimes = crimes,
                notes = notes,
                fines = citizenFines
            })
        end

        cb(playersData)
    else
        cb({})
    end
end)

ESX.RegisterServerCallback("Peakville:Terminal:InsertNote", function(source, cb, identifier, note)
    local src = source
    if loggedIn[src] then
        local insertedId = MySQL.insert.await("INSERT INTO citizen_notes (identifier, note, date) VALUES (?, ?, NOW())", {identifier, note})
        if insertedId then
            local result = MySQL.query.await("SELECT date FROM citizen_notes WHERE id = ?", {insertedId})
            cb({ success = true, id = insertedId, date = result[1].date })
        else
            cb({ success = false, id = nil, date = nil })
        end
    else
        cb({})
    end
end)

ESX.RegisterServerCallback("Peakville:Terminal:DeleteNote", function(source, cb, noteId)
    local src = source
    if loggedIn[src] == 2 then
        local result = MySQL.query.await("DELETE FROM citizen_notes WHERE id = ?", {noteId})
        if result then
            cb(true)
        else
            cb(false)
        end
    else
        cb(false)
    end
end)

ESX.RegisterServerCallback("Peakville:Terminal:InsertCrime", function(source, cb, identifier, record)
    local src = source
    if loggedIn[src] then
        local insertedId = MySQL.insert.await("INSERT INTO crime_records (identifier, record, date) VALUES (?, ?, NOW())", {identifier, record})
        if insertedId then
            local result = MySQL.query.await("SELECT date FROM crime_records WHERE id = ?", {insertedId})
            cb({ success = true, id = insertedId, date = result[1].date })
        else
            cb({ success = false, id = nil, date = nil })
        end
    else
        cb({ success = false, id = nil, date = nil })
    end
end)

ESX.RegisterServerCallback("Peakville:Terminal:DeleteCrime", function(source, cb, crimeId)
    local src = source
        if loggedIn[src] == 2 then
        local result = MySQL.query.await("DELETE FROM crime_records WHERE id = ?", {crimeId})
        if result then
            cb(true)
        else
            cb(false)
        end
    else
        cb(false)
    end
end)

ESX.RegisterServerCallback("Peakville:Terminal:DeleteFine", function(source, cb, fineId)
    local src = source
    if loggedIn[src] == 2 then
        local result = MySQL.query.await("DELETE FROM citizen_fines WHERE id = ?", {fineId})
        if result then
            cb(true)
        else
            cb(false)
        end
    else
        cb(false)
    end
end)

ESX.RegisterServerCallback("Peakville:Terminal:InsertFine", function(source, cb, identifier, amount, reason, firstname, lastname)
    local src = source
    if loggedIn[src] then
        local insertedId = MySQL.insert.await("INSERT INTO citizen_fines (identifier, amount, reason, date) VALUES (?, ?, ?, NOW())", {identifier, amount, reason})
        if insertedId then
            local result = MySQL.query.await("SELECT date FROM citizen_fines WHERE id = ?", {insertedId})
            cb({ success = true, id = insertedId, date = result[1].date })
        else
            cb({ success = false, error = "Errore nell'inserimento della multa" })
        end
    else
        cb({ success = false, error = "Non autorizzato" })
    end
end)

ESX.RegisterServerCallback("Peakville:Terminal:flagfinepayd", function(source, cb, fineId)
    local src = source
    if loggedIn[src] then
        local result = MySQL.query.await("UPDATE citizen_fines SET status = 'Pagata' WHERE id = ?", {insertedId})
        if result then
            cb({ success = true })
        else
            cb({ success = false, error = "Errore nel sistema" })
        end
    else
        cb({ success = false, error = "Non autorizzato" })
    end
end)

exports("IsLoggedIn", function(source)
    return loggedIn[source]
end)