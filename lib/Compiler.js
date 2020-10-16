import path from 'path';
import fs from 'fs';
let babylon = require('babylon');
import traverse from "@babel/traverse";
let types = require("@babel/types");
import generator from "@babel/generator";
let ejs = require('ejs'); 
import { SyncHook } from 'tapable'
class Compiler {
    constructor(config) {
        this.config = config;
        this.hooks = {
            entryOption: new SyncHook(),
            compiler: new SyncHook(),
            afterCompile: new SyncHook(),
            afterPlugins: new SyncHook(),
            run: new SyncHook(),
            emit: new SyncHook(),
            done: new SyncHook()
        }
        let plugins = this.config.plugins;
        if (Array.isArray(plugins)) {
            plugins.forEach(pluginObj => {
                pluginObj.apply(this);
            })
        }
        this.hooks.afterPlugins.call();
        this.entryId;
        this.modules = {};
        this.entryId = config.entry;
        this.root = process.cwd();
    }
    buildModule(modulePath, isEntry) {
        // 模块内容
        let source = this.getSource(modulePath);
        // 模块id
        let moduleName = './' + path.relative(this.root, modulePath);
        if (isEntry) {
            this.entryId = moduleName;
        }
        // 解析 把source源码 进行改造 返回依赖列表
        let { sourceCode, dependcies } = this.parse(source, path.dirname(moduleName))
        this.modules[moduleName] = sourceCode
        dependcies.forEach(depPath => {
            this.buildModule(path.join(this.root, depPath), false)
        })
    }
    parse(source, parentPath) {
        let ast = babylon.parse(source);
        let dependcies = [];
        traverse(ast, {
            CallExpression(p) {
                let node = p.node;
                if (node.callee.name === 'require') {
                    node.callee.name = '__webpack_require__'; // 更改节点名字
                    let moduleName = node.arguments[0].value;
                    moduleName = moduleName + (path.extname(moduleName) ? '' : ".js")
                    moduleName = "./" + path.join(parentPath, moduleName)
                    dependcies.push(moduleName);
                    // 改变对应的值
                    node.arguments = [types.stringLiteral(moduleName)]
                }
            }
        })
        // 生成js代码
        let sourceCode = generator(ast).code;
        return { sourceCode, dependcies };
    }
    getSource(modulePath) {
        let rules = this.config.module.rules;
        let content = fs.readFileSync(modulePath, "utf8");
        for (let i = 0; i < rules.length; i++) {
            let rule = rules[i];
            let { test, use } = rule;
            let len = use.length - 1;
            if (test.test(modulePath)) {
                function normalLoader() {
                    let loader = require(use[len--]);
                    content = loader(content);
                    if (len >= 0) {
                        normalLoader();
                    }
                }
                normalLoader();
            }
        }
        return content;
    }
    emitFile() {
        let mainPath = path.join(this.config.output.path, this.config.output.filename);
        let template = this.getSource(path.join(__dirname, 'main.ejs'));
        let code = ejs.render(template, {
            entryId: this.entryId,
            modules: this.modules
        })
        this.assets = {};
        this.assets[mainPath] = code;
        fs.writeFileSync(mainPath, this.assets[mainPath]);
    }
    run() {
        this.hooks.run.call();
        this.hooks.compiler.call();
        this.buildModule(path.resolve(this.root, this.entryId), true);
        this.hooks.afterCompile.call();
        this.emitFile();
        this.hooks.emit.call();
        this.hooks.done.call();
    }
}
export default Compiler;
