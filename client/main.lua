Target = exports["ox_target"]
ESX = exports["es_extended"]:getSharedObject()
sound = exports["br_player"]
Skills = exports["peakville_skilltree"]

terminal = new Terminal()

RegisterNuiCallback("exit", function(data, cb)
    cb({})
    ExecuteCommand('emotecancel')
    LocalPlayer.state.invHotkeys = true
    terminal:deactivateCamera()
    terminal:setActive(false)
    LocalPlayer.state:set("inTerminal", false, true)
    ClearPedTasks(PlayerPedId())
end)

RegisterNuiCallback("login", function(data, cb)
    local correct = ESX.AwaitServerCallback("Peakville:Terminal:Login", data.username, data.password)
    cb({correct = correct})
end)

RegisterNuiCallback("logout", function(data, cb)
    TriggerServerEvent("Peakville:Terminal:LogOut")
    cb(true)
end)

RegisterNuiCallback("blackout", function(data, cb) --Mettere blackout
    TriggerServerEvent("Peakville:Blackout:SetTerminalBlackout", data.duration * 1000)
    cb({})
end)

RegisterNuiCallback("bank_open_shutters", function(data, cb) --Mettere banca
    TriggerServerEvent("Peakville:Terminal:BankOpenShutters")
    cb({})
end)

RegisterNuiCallback("announcement", function(data, cb)
    TriggerServerEvent("Peakville:Terminal:ToggleAnnouncement")
    cb({})
end)

RegisterNuiCallback("getAnklets", function(data, cb)
    local anklets = ESX.AwaitServerCallback('lele_anklets:getAnklets')
    cb(anklets or {})
end)

RegisterNuiCallback("localizePlayer", function(data, cb)
    local ankletId = data.ankletId
    if not ankletId then
        cb({ success = false, error = "Missing anklet id" })
        return
    end

    local serverId = tonumber(ankletId)
    if not serverId then
        cb({ success = false, error = "Invalid anklet id" })
        return
    end

    local targetPlayer = GetPlayerFromServerId(serverId)
    if not targetPlayer then
        cb({ success = false, error = "Player not found" })
        return
    end

    local targetPed = GetPlayerPed(targetPlayer)
    if not DoesEntityExist(targetPed) then
        cb({ success = false, error = "Player entity does not exist" })
        return
    end
        local pos = GetEntityCoords(targetPed)
        local blip = AddBlipForCoord(pos.x, pos.y, pos.z)
        TriggerServerEvent('lele_needs:manageStress', GetPlayerServerId(PlayerId()), -5.0, 0)
        SetBlipSprite(blip, 1)
        SetBlipColour(blip, 3)
        SetBlipScale(blip, 0.7)
        BeginTextCommandSetBlipName("STRING")
        AddTextComponentString(data.name)
        EndTextCommandSetBlipName(blip)

        Citizen.SetTimeout(300000, function()
            if DoesBlipExist(blip) then
                RemoveBlip(blip)
            end
        end)


    cb({ success = true })
end)

RegisterNuiCallback("getPlayersData", function(data, cb)
    local playerData = ESX.AwaitServerCallback("Peakville:Terminal:GetPlayersData")
    cb(playerData)
end)

RegisterNuiCallback("insertNote", function(data, cb)
    local identifier = data.identifier
    local note = data.note

    local result = ESX.AwaitServerCallback("Peakville:Terminal:InsertNote", identifier, note)
    cb(result)
end)

RegisterNuiCallback("insertCrime", function(data, cb)
    local identifier = data.identifier
    local record = data.record

    local result = ESX.AwaitServerCallback("Peakville:Terminal:InsertCrime", identifier, record)
    cb(result)
end)

RegisterNuiCallback("deleteNote", function(data, cb)
    local noteId = data.noteId

    local success = ESX.AwaitServerCallback("Peakville:Terminal:DeleteNote", noteId)
    cb({ success = success })
end)

RegisterNuiCallback("deleteCrime", function(data, cb)
    local crimeId = data.crimeId

    local success = ESX.AwaitServerCallback("Peakville:Terminal:DeleteCrime", crimeId)
    cb({ success = success })
end)

-- Helper function: Returns a vehicle entity matching the given plate
function getVehicleByPlate(plate)
    local position = lib.callback.await("getvehicleposition", nil, plate)
    print("Position for plate " .. plate .. ": ", json.encode(position))
    if position then return position end
    
    return nil
end

-- Utility function to iterate over vehicles in the world
function EnumerateVehicles()
    return coroutine.wrap(function()
        local handle, vehicle = FindFirstVehicle()
        if not vehicle or vehicle == 0 then
            EndFindVehicle(handle)
            return
        end
        local next = true
        while next do
            coroutine.yield(vehicle)
            next, vehicle = FindNextVehicle(handle)
        end
        EndFindVehicle(handle)
    end)
end

RegisterNuiCallback("addblipbyplate", function(data, cb)
    local plate = data.plate:match("^%s*(.-)%s*$"):upper()
    if not plate then
        cb({ success = false, error = "No license plate provided." })
        return
    end

    local datas = getVehicleByPlate(plate)
    if not datas.pos then
        cb({ success = false, error = "Vehicle with plate " .. plate .. " not found." })
        return
    end

    local allowed = false
    for _, allowedVehicle in ipairs(Config.AllowedVehicles) do
        if datas.model == tostring(allowedVehicle) then
            allowed = true
            break
        end
    end

    if allowed then
            TriggerServerEvent('lele_needs:manageStress', GetPlayerServerId(PlayerId()), -5.0, 0)

            local blip = AddBlipForCoord(datas.pos.x, datas.pos.y, datas.pos.z)
            SetBlipSprite(blip, 1)
            SetBlipColour(blip, 2)
            SetBlipScale(blip, 0.7)
            BeginTextCommandSetBlipName("STRING")
            AddTextComponentString("Vehicle: " .. plate)
            EndTextCommandSetBlipName(blip)

            Citizen.SetTimeout(300000, function()
                if DoesBlipExist(blip) then
                    RemoveBlip(blip)
                end
            end)
            cb({ success = true })

    else
        cb({ success = false, error = "Vehicle model (" .. datas.model .. ") is not allowed." })
    end
end)

function shiftChar(c)
    if c:match("%l") then
      return c:upper()
    end
  
    local shiftMapping = {
      ["1"] = "!",
      ["2"] = "\"",
      ["3"] = "£",
      ["4"] = "$",
      ["5"] = "%",
      ["6"] = "&",
      ["7"] = "/",
      ["8"] = "(",
      ["9"] = ")",
      ["0"] = "=",
      ["-"] = "_",
      ["+"] = "*",
      ["è"] = "é",
      ["ò"] = "ç",
      ["\\"] = "|",
      ["ù"] = "§",
      [","] = ";",
      ["."] = ":",
      ["'"] = "?",
    }
  
    return shiftMapping[c] or c
end

function shiftCharToLower(c)
    if c:match("%u") then
      return c:lower()
    end
  
    return c
end
Citizen.CreateThread(function()
    local nearPoints = {}

    while true do
        local playerCoords = GetEntityCoords(PlayerPedId())
        local foundNear = {}

        for i, point in ipairs(Config.Points) do
            local distance = #(playerCoords - point)
            if distance < 5.0 then
                foundNear[i] = true
                if not nearPoints[i] then
                    nearPoints[i] = true
                    terminal:createN3d(i, point)
                end
            else
                if nearPoints[i] then
                    terminal:deleteN3d(i)
                    nearPoints[i] = nil
                end
            end
        end

        Citizen.Wait(1000)
    end
end)

Citizen.CreateThread(function()
    Target:addModel(Config.Model, {
        {
            name = "interactTerminal",
            label = "Interagisci con il terminale",
            icon = "fa-solid fa-terminal",
    
            canInteract = function()
                return terminal.loaded
            end,

            onSelect = function(data)
                LocalPlayer.state.invHotkeys = false
                ExecuteCommand('e type4')
                terminal:createCamera(data.entity)
                terminal:activeCamera()
                terminal:setActive(true)
                LocalPlayer.state:set("inTerminal", true, true)
            end
        }
    })

    for k,v in pairs(Config.Keys) do
        IsControlJustPressed(v, function()
            if terminal.active then
                local newV = nil
                if IsControlJustPressed(0, 21) or IsDisabledControlPressed(0, 21) then
                    newV = Config.KeymappingToChar[v] or v
                    newV = shiftChar(newV)
                else
                    newV = Config.KeymappingToChar[v] or v
                    newV = shiftCharToLower(newV)
                end
                data = {file = "click.wav", volume = 0.2}
                exports["br_player"]:play(data)

                terminal.n3d:msg({
                    type = "keyPress",
                    key = newV
                })
            end
        end, "Tasti terminale", true)
    end
end)
