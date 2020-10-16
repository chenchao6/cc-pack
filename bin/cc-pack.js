import Compiler from '../lib/Compiler.js';
import config from '../webpack.config.js';
let compiler = new Compiler(config);
compiler.hooks.entryOption.call();
compiler.run();
