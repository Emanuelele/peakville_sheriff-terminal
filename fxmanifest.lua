fx_version 'cerulean'
game 'gta5'
lua54 "yes"

files {
	"dui/*.*",
}

client_scripts {
    "@utility_lib/client/native.lua",
    '@ox_lib/init.lua',
	"config.lua",
    'client/classes/*.lua',
    'client/*.lua',
}

server_scripts {'@lele_networkprofiler/wrapper.lua',
	'@oxmysql/lib/MySQL.lua',
    '@ox_lib/init.lua',
    "config.lua",
    "server.lua"
}

dependency "leap"