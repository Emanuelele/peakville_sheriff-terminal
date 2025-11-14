ESX = exports["es_extended"]:getSharedObject()
xSound = exports["xsound"]
CDN = exports["peakville_cdn"]

loggedIn = {}

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

RegisterNetEvent("Peakville:Terminal:LogOut", function()
    local src = source
    loggedIn[src] = nil
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
        local users = MySQL.query.await("SELECT identifier, firstname, lastname, dateofbirth, sex, height FROM users")
        local extraInfo = MySQL.query.await("SELECT identifier, stato, etnia, scarpe, sangue, descrizione_condanne_penali, stato_sociale FROM user_extra_info")
        local crimeRecords = MySQL.query.await("SELECT id, identifier, record FROM crime_records")
        local citizenNotes = MySQL.query.await("SELECT id, identifier, note FROM citizen_notes")

        local playersData = {}

        for _, user in pairs(users) do
            local extra = {}
            for _, info in pairs(extraInfo) do
                if info.identifier == user.identifier then
                    extra = info
                    break
                end
            end

            local crimes = {}
            for _, crime in pairs(crimeRecords) do
                if crime.identifier == user.identifier then
                    table.insert(crimes, { id = crime.id, text = crime.record })
                end
            end

            local notes = {}
            for _, note in pairs(citizenNotes) do
                if note.identifier == user.identifier then
                    table.insert(notes, { id = note.id, text = note.note })
                end
            end

            table.insert(playersData, {
                identifier = user.identifier,
                firstname = user.firstname,
                lastname = user.lastname,
                date_of_birth = user.dateofbirth,
                gender = user.sex,
                height = user.height,
                social_status = extra.stato_sociale,
                state = extra.stato or "N/A",
                ethnicity = extra.etnia or "N/A",
                shoes = extra.scarpe or "N/A",
                blood_type = extra.sangue or "N/A",
                criminal_records_description = extra.descrizione_condanne_penali or "N/A",
                crimes = crimes,
                notes = notes
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
        local insertedId = MySQL.insert.await("INSERT INTO citizen_notes (identifier, note) VALUES (?, ?)", {identifier, note})
        if insertedId then
            cb({ success = true, id = insertedId })
        else
            cb({ success = false, id = nil })
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
        local insertedId = MySQL.insert.await("INSERT INTO crime_records (identifier, record) VALUES (?, ?)", {identifier, record})
        if insertedId then
            cb({ success = true, id = insertedId })
        else
            cb({ success = false, id = nil })
        end
    else
        cb({ success = false, id = nil })
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

exports("IsLoggedIn", function(source)
    return loggedIn[source]
end)
