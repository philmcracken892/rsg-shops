fx_version 'cerulean'
rdr3_warning 'I acknowledge that this is a prerelease build of RedM, and I am aware my resources *will* become incompatible once RedM ships.'
game 'rdr3'

description 'rsg-shops'
version '2.0.9'

shared_scripts {
    '@ox_lib/init.lua',
    'config.lua',
}

client_scripts {
    'client/client.lua'
}

server_scripts {
    'server/server.lua',
    'server/versionchecker.lua'
}


files {
	'locales/*.json',
}

dependencies {
    'rsg-core',
    'rsg-inventory',
    'ox_lib'
}


ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js'
}


lua54 'yes'
