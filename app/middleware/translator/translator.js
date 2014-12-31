(function(Translator){
	"use strict";
	var nconf = require('nconf');

	var utils = require('./../../../public/utils.js'),
        // Meta = require('../../src/meta'),
        path = require('path'),
        fs = require('fs'),
        logger = require('log4js').getLogger("Translator");

    // i18n files
    var files = {
    	loaded: {},
    	mapping: {}
    };

    // mapping file (key file)
    var mappingfile = path.join(__dirname, './', 'mapping.json');
	files.mapping = require(mappingfile);

    // default language
	Translator._lang = 'fr';

    // translated view file
    var TranslatedView = function(translateFile){
        this.translateFile = translateFile;
    };

    TranslatedView.prototype.get = function(key){
        try{
            if(key !== undefined){
                return this.translateFile[key];
            }else{
                return this.translateFile;
            }
        }catch (exception){
            return "undefined";
        }
    };

    // translator
	Translator.init = function(language){
		if (language!== undefined) {
			Translator._lang = language;
		}
		this.load();
		return this;
	};

    Translator.get = function(view, key){
        try{
            return files.loaded[this.map(view)][key];
        }catch (exception){
            return "undefined";
        }
    };

	Translator.map = function(view){
		return files.mapping[view];
	};

    Translator.instance = function(view){
        var mappedI18nFile = files.loaded[this.map(view)];
        if(mappedI18nFile !== undefined){
            return new TranslatedView(mappedI18nFile);
        }else{
            return new TranslatedView(files.loaded[view]);
        }
    };

	Translator.load = function(){
		//language = Meta.config.defaultLang || 'en_GB';
		var language = Translator._lang;
        if (!fs.existsSync(path.join(__dirname, './', language))) {
                logger.warn('[translator] Language \'' + Meta.config.defaultLang + '\' not found. Defaulting to \'en_GB\'');
                language = 'en_GB';
        }

        utils.walk(path.join(__dirname, './', language), function (err, data) {
            for (var d in data) {
                if (data.hasOwnProperty(d)) {
                    // Only load .json files
                    if (path.extname(data[d]) === '.json') {
                    	logger.info("loaded language file: " + path.basename(data[d]));
                        files.loaded[path.relative(__dirname, data[d]).replace('.json', '').slice(3)] = require(data[d]);
                    } else {
                        if (process.env.NODE_ENV === 'development') {
                            logger.warn('[translator] Skipping language file: ' + path.relative(path.join(__dirname, './'), data[d]));
                        }
                    }
                }
            }
        });
    };
}(exports));