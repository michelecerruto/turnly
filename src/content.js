// Content scripts can't be ES modules, so this classic script only loads the real entry point.
import(chrome.runtime.getURL('src/main.js'));
