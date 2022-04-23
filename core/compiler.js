const { SyncHook } = require('tapable');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');
const { toUnixPath, tryExtensions } = require('./utils');
const path = require('path');
const fs = require('fs');

/**
 * @typedef Module
 * @property {string} id 模块相对路径
 * @property {string} _source 模块转译后的源码
 * @property {Set<string>} dependencies 模块依赖
 * @property {string[]} name 模块入口名称(也作为模块名称)
 */

/**
 * @typedef Chunk
 * @property {string} name chunk的名称(即entry的名称)
 * @property {Module} entryModule chunk的入口文件
 * @property {Array<Module>} modules chunk的所有依赖
 */

class Compiler {
  /**
   * @param {Object} mergedOptions
   */
  constructor(mergedOptions) {
    this.options = mergedOptions;
    // 寻找根路径,默认为项目根路径
    this.rootPath = this.options.context || toUnixPath(process.cwd());
    /**
     * @template {any} T
     * @template {any} R
     * @template {any} AdditionalOptions
     * @type {Record<'run'|'emit'|'done', SyncHook<T, R, AdditionalOptions>>}}
     */
    this.hooks = {
      // 编译开始执行
      run: new SyncHook(), // 输出assets至output目录之前执行
      emit: new SyncHook(), // 结束编译时执行
      done: new SyncHook()
    };

    /**
     * @description 存储入口模块对象
     * @type {Set<any>}
     */
    this.entries = new Set();
    /**
     * @description 存储模块依赖对象
     * @type {Set<Module>}
     */
    this.modules = new Set();
    /**
     * @description 存储代码块对象
     * @type {Set<Chunk>}
     */
    this.chunks = new Set();
    /**
     * @description 存储本次产出的文件对象
     * @type {Map<string,any>}
     */
    this.assets = new Map();
    /**
     * @description 存储本次编译产出的文件名
     * @type {string[]}
     */
    this.files = [];
  }

  run(callback) {
    this.hooks.run.call();
    const entry = this.getEntry();
    this.buildEntryModule(entry);
    console.log('entries=>', this.entries);
    console.log('modules=>', this.modules);
    console.log('chunks=>', this.chunks);
    // 导出文件
    this.exportFile(callback);
  }

  /**
   * @description 入口模块编译函数
   * @param {Record<string,string>} entry
   */
  buildEntryModule(entry) {
    Object.entries(entry).forEach(([entryName, entryPath]) => {
      const entryRecord = this.buildModule(entryName, entryPath);
      this.entries.add(entryRecord);
      // 至此,一个入口中的所有文件已经解析完毕,根据入口文件与其依赖的关系，开始组装chunk
      this.buildUpChunk(entryName, entryRecord);
    });
  }

  /**
   * @description 模块编译函数
   * @param {string} moduleName
   * @param {string} modulePath
   * @returns Module
   */
  buildModule(moduleName, modulePath) {
    // 1.读取源码,并将moduleCode与originModuleCode设置为当前正在读取的模块
    const originSourceCode = this.moduleCode = this.originSourceCode = fs.readFileSync(modulePath, 'utf8');
    // 2.调用loader
    this.handlerLoader(modulePath);
    // 3.调用webpack进行模块编译,得到module对象
    return this.handleWebpackModule(moduleName, modulePath);
  }

  /**
   * @description 模块编译，得到模块对象
   * @param moduleName
   * @param modulePath
   * @return Module
   */
  handleWebpackModule(moduleName, modulePath) {
    // 计算相对路径
    const moduleId = './' + path.posix.relative(this.rootPath, modulePath);
    /**
     * @type {Module}
     */
    const module = {
      id: moduleId, _source: '', dependencies: new Set(), // 模块依赖
      name: [moduleName] // 模块入口文件
    };
    // 调用babel
    const ast = parser.parse(this.moduleCode, { sourceType: 'module' });
    traverse(ast, {
      // 将require中的依赖收集至dependencies中
      CallExpression: (nodePath) => {
        const node = nodePath.node;
        // 获取所有require函数节点
        if (node.callee.name === 'require') {
          // 拿到require函数引用的相对路径
          const requirePath = node.arguments[0].value;
          // 寻找模块绝对路径 当前模块路径 + require相对路径
          const moduleDirName = path.posix.dirname(modulePath);
          const absolutePath = tryExtensions(path.posix.join(moduleDirName, requirePath), this.options.resolve.extensions, requirePath, moduleDirName);
          // 生成moduleId - 针对于根路径的模块ID 添加模块依赖路径
          // 上面的几次转换都是为了在这里获取依赖的相对路径
          const moduleId = './' + path.posix.relative(this.rootPath, absolutePath);
          // 借助babel的转换能力,将require变成__webpack__require__
          node.callee = t.identifier('__webpack__require__');
          // 将路径参数修改为相对根路径来处理
          node.arguments = [t.stringLiteral(moduleId)];
          // 添加至dependencies
          /**
           * @type {Module|null}
           */
          let alreadyModule = null;
          this.modules.forEach(m => {
            if (m.id === moduleId) {
              alreadyModule = m;
            }
          });
          if (alreadyModule) {
            alreadyModule.name.push(moduleName);
          } else {
            module.dependencies.add(moduleId);
          }
        }
      }
    });
    const { code } = generator(ast);
    module._source = code;
    if (module.dependencies.size) {
      module.dependencies.forEach(dependency => {
        const depModule = this.buildModule(moduleName, dependency);
        // modules中存放所有的依赖项
        this.modules.add(depModule);
      });
    }
    return module;
  }

  /**
   * @description 将moduleCode用规则相匹配的loader进行处理
   * @param {string} modulePath
   */
  handlerLoader(modulePath) {
    const loaders = this.options.module.rules;
    const matchedRules = [];
    loaders.forEach(loader => {
      if (loader.test.test(modulePath)) {
        // 此处仅考虑use的情况，实际上还有直接传入loader的情况
        // if (loader.use) {
        matchedRules.push(...loader.use);
        // } else if (loader.loader) {
        //   matchedRules.push(loader.loader);
        // }
      }
    });

    // 倒序执行loader
    for (let i = matchedRules.length - 1; i >= 0; i--) {
      const loader = require(matchedRules[i]);
      this.moduleCode = loader(this.moduleCode);
    }
  }

  /**
   * @description 组装chunk
   * @param {string} entryName
   * @param {Module} entryRecord
   */
  buildUpChunk(entryName, entryRecord) {
    /**
     * @type {Chunk}
     */
    const chunk = {
      name: entryName, entryModule: entryRecord, modules: Array.from(this.modules).filter(i => {
        return i.name.includes(entryName);
      })
    };
    this.chunks.add(chunk);
  }

  /**
   * @description 导出最终的文件
   * @param {Function} callback
   */
  exportFile(callback) {
    const output = this.options.output;
    // 根据chunks生成assets内容
    this.chunks.forEach(chunk => {
      const parseFileName = output.filename.replace('[name]', chunk.name);
      this.assets[parseFileName] = this.getSourceCode(chunk);
    });
    //  生成结束,调用emit钩子
    this.hooks.emit.call();
    // 创建目录
    if (!fs.existsSync(output.path)) {
      fs.mkdirSync(output.path);
    }
    // files中存放所有的文件名
    this.files = Object.keys(this.assets);
    // 将assets中的内容生成最终的📦文件,写入文件系统
    Object.entries(this.assets).forEach(([fileName, fileContent]) => {
      const filePath = path.join(output.path, fileName);
      fs.writeFileSync(filePath, fileContent);
    });
    // 写入结束钩子
    this.hooks.done.call();
    callback(null, {
      toJson: () => {
        return {
          entries: this.entries, files: this.files, modules: this.modules, chunks: this.chunks, assets: this.assets,
        };
      }
    });
  }

  /**
   * @description 根据chunk生成code
   * @param {Chunk} chunk
   */
  getSourceCode(chunk) {
    const { name, entryModule, modules } = chunk;
    return `(()=>{
      var __webpack_modules__ = {
    ${modules.map(module => `'${module.id}':(module)=>{
             ${module._source}
          }`).join(',')}
    }
      // The module cache
      var __webpack_module_cache__ = {};
      // The require function
      function __webpack__require__(moduleId) {
        // Check if module is in cache
        var cachedModule = __webpack_module_cache__[moduleId];
        if (cachedModule !== undefined) {
          return cachedModule.exports;
        }
        // Create a new module (and put it into the cache)
        var module = (__webpack_module_cache__[moduleId] = {
          // no module.id needed
          // no module.loaded needed
          exports: {},
        });

        // Execute the module function
        __webpack_modules__[moduleId](module, module.exports, __webpack__require__);

        // Return the exports of the module
        return module.exports;
      }
      var __webpack_exports__ = {};
      // This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
      (() => {
       ${entryModule._source}
      })();
    })()`;
  }

  close(callback) {
    this.hooks.done.call();
  }

  /**
   * @description 获取打包入口对象(允许多入口)
   */
  getEntry() {
    /**
     * @type {Record<string,string>} entry
     */
    let entry = Object.create(null);
    const { entry: optionsEntry } = this.options;
    if (typeof optionsEntry === 'string') {
      // 默认将main设置为入口id
      entry.main = optionsEntry;
    } else {
      entry = optionsEntry;
    }
    Object.entries(entry).forEach(/**
     * @param {string} key
     * @param {string} entryPath
     */([key, entryPath]) => {
      // 将entryPath变为绝对路径
      if (!path.isAbsolute(entryPath)) {
        entryPath[key] = path.resolve(this.rootPath, entryPath);
      }
    });
    return entry;
  }


}

module.exports = Compiler;
