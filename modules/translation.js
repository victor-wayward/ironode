
// --- Translation Helper ---

// instantiates and exports i18n module
// lang files are under views/lang
// the idea here is not to try to guess user locale from http headers or a cookie
// just set the default locale and change it only upon user request (http parameter lang)


const path = require('path');						// unix/dos path resolver
const appdir = require('app-root-dir').get();		// get app path
const log = require('logger');						// create logger
const config = require('config');					// configuration

// validate json lang files (they are fragile)
const fs = require('fs');
fs.readdirSync(path.resolve(appdir + '/views/lang')).forEach(function (file) {
	try {
        a = JSON.parse(fs.readFileSync(path.resolve(appdir + '/views/lang/' + file), { encoding: 'utf8' }));
    } catch(err) {
        log.error('translation (JSON.parse): ' + file);
    }
});	

// use i18n module
var i18n = require('i18n');

i18n.configure({
//	locales: config.get('lang.all'),
	directory: path.resolve(appdir + '/views/lang'),
//	queryParameter: 'lang',
//	defaultLocale: config.get('lang-default'),
//	cookie: 'locale', 
	objectNotation: true,
//	register: global, 										
	autoReload: true
});

// set locale to the default one
i18n.locale = config.get('site.lang-default');

module.exports = i18n;

