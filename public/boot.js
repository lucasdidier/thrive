// Loads the language first (public/i18n.js), then the app, so labels that modules build when they load are
// already translated. The workspace's saved language wins over this browser's (app.js reloads once if they differ).
import {setLanguage,startLanguage} from './i18n.js';
await setLanguage(startLanguage());
await import('./app.js');
