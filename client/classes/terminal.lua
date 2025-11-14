class Terminal {
    n3d = nil,
    active = false,

    startDisableControls = function()
        Citizen.CreateThread(function()
            while self.active do
                DisableAllControlActions(0)
                EnableControlAction(0, 249, true) 
                Citizen.Wait(1)
            end
        end)
    end,

    setActive = function(status)
        self.active = status

        exports["peakville_chat"]:SetChatActive(not status)
        exports["peakville_pausemenu"]:DisableMenus(status)

        if self.active then
            self:startDisableControls()
        end
    end,

    createN3d = function()
        self.n3d, self.handle = CreateNui3d("peakville_terminal.gfx")
        self.n3d:init("dui/index.html", 2048, 2048)

        Citizen.Wait(500)
        self.n3d:replaceTexture("markz_props_terminal_ytd", "markz_terminalscreen_d")

        print(HasScaleformMovieLoaded(self.handle))
        self.loaded = true
    end,

    deleteN3d = function()
        if self.n3d then
            self.n3d:destroy()
            self.n3d = nil
        end
        
        self.loaded = false
    end,

    createCamera = function(terminalEntity)
        self.camera = CreateCam("DEFAULT_SCRIPTED_CAMERA", true)
        AttachCamToEntity(self.camera, terminalEntity, 0.0, -0.23, 0.1, true)
        PointCamAtEntity(self.camera, terminalEntity, 0.0, 0.0, 0.1)
    end,

    activeCamera = function()
        SetCamActive(self.camera, true)
        RenderScriptCams(1, 1, 2000)
    end,

    deactivateCamera = function()
        RenderScriptCams(nil, true, 500)
        Citizen.Wait(500)
        DestroyCam(self.camera)
    end
}