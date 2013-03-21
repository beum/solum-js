/*global solum:true, $:true, ko:true, module:true */

/*
 * solum.js - translation
 * author: brandon eum
 * date: Sep 2012
 */

/**
 * Dependencies:
 *  - Assumes knockout.js
 *  - Assumes solum.js
 */

/**
 *
 */
module.exports = (function (root) {
  "use strict";

  /**
   * Translation namespace for all objects/functions related to translation
   */
  var translation = {};

  /**
   * Container for all of the translation dictionaries available.
   */
  translation.dictionary = {en: {}};

  translation.addDictionary = function (dict) {
    // This will overwrite existing entries with the new dictionary
    translation.dictionary = $.extend(true, {}, dict, translation.dictionary);
  };

  /**
   * Use the global settings for the localization settings, but set no dictionary
   * by default.
   */
  translation.defaultConfig = {
    // Use the global locale
    //locale: root.config.locale,
    // Use the global date/number format localization
    //dateNumberLocalization: root.config.dateAndNumberFormatLocalization
    locale: "en"
  };

  /**
   * The mirage translator provides symfony2-style translation based on a dictionary
   * and date/number localization.
   */
  translation.translator = function (config) {
    var self, locale, dictionary, translations, localized_format;

    // Merge the new config with the default configurations
    config = $.extend({}, translation.defaultConfig, config);

    self             = this;
    locale           = config.locale;
    dictionary       = translation.dictionary;
    translations     = dictionary[locale];
    //localized_format = config.dateNumberLocalization[locale];

    /**
     * Mimics the symfony translator, which will look in the specified dictionary,
     * find the correct translation based on '.' delimited keys and replace any
     * wildcards.
     */
    self.translate = function (text, replace) {
      var key, keys, trans, i, j, r, v;

      keys = text.split('.');
      trans = translations;

      // Loop through the keys and find the proper translation
      for (j in keys) {
        if (keys.hasOwnProperty(j)) {
          if (typeof trans[keys[j]] === 'string' || typeof trans[keys[j]] === 'object') {
            trans = trans[keys[j]];
          } else {
            // Could not find translation, use given text
            trans = text;
          }
        }
      }

      // Replace wildcards with the appropriate text replacement
      for (i in replace) {
        if (replace.hasOwnProperty(i)) {
          key = '%' + i + '%';

          // Does the text replacement need translation?
          if (!replace[i].mustTranslate) {
            trans = trans.replace(key, replace[i]);
          } else {
            // Use different translation engines depending on the type
            r = replace[i];
            v = r.value;
            if (r.type === 'date') {
              v = self.dateToLocalizedString(v);
            } else if (r.type === 'number') {
              v = self.numberToLocalizedNumberString(v);
            } else if (r.type === 'currency') {
              v = self.numberToLocalizedCurrencyString(v);
            } else {
              v = self.translate(v);
            }

            trans = trans.replace(key, v);
          }
        }
      }

      return trans;
    };

    /**
     * Translate a JS date object to a localized date string
     */
    self.dateToLocalizedString = function (dateObj) {
      if (!(dateObj instanceof Date)) {
        throw "Translator.dateToLocalizedString: tried to translate a non-date object.";
      }

      return dateObj.toString(localized_format.date.format);
    };

    self.numberToLocalizedNumberString = function (num) {};
    self.numberToLocalizedCurrencyString = function (num) {};
  };// END TRANSLATOR

  return translation;
}());
