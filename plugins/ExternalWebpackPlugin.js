const { ExternalModule } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

class ExternalWebpackPlugin {
  pluginName = 'ExternalWebpackPlugin';

  /**
   * @param {Record<string,{variableName:string,src:string}>} options
   */
  constructor(options) {
    this.options = options;
    /**
     * @description 需要提取的仓库
     * @type {string[]}
     */
    this.transformLibrary = Object.keys(options);
    /**
     * @description 使用到的仓库
     * @type {Set<any>}
     */
    this.usedLibrary = new Set();
  }

  /**
   * @param {Compiler} compiler
   */
  apply(compiler) {
    // 在normalModuleFactory创建时触发
    compiler.hooks.normalModuleFactory.tap(this.pluginName, normalModuleFactory => {
      // 初始化解析模块前调用
      normalModuleFactory.hooks.factorize.tapAsync(this.pluginName, (resolveData, callback) => {
        /**
         * 正在引入的模块名称
         * @type {string}
         */
        const requireModule = resolveData.request;
        if (this.transformLibrary.includes(requireModule)) {
          const externalModuleName = this.options[requireModule].variableName;
          // 创建一个外部依赖返回, 这样做的话webpack便不会编译该模块,直接当外部依赖处理
          callback(null, new ExternalModule(
            // request 创建外部依赖时,模块生成的变量名
            externalModuleName,
            // type 这个变量会挂载在哪个对象中
            'window',
            // useRequest 表示webpack打包文件时, 生成的唯一moduleId
            externalModuleName));
        } else {
          // 正常编译
          callback();
        }
      });
      // 通过for获取parser这个hookMap中的hook
      normalModuleFactory.hooks.parser.for('javascript/auto').tap(this.pluginName, parser => {
        this.importHandler(parser);
        this.requireHandler(parser);
      });
    });
    compiler.hooks.compilation.tap(this.pluginName, compilation => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tap(this.pluginName, data => {
        // 额外添加的script
        const scriptTags = data.assetTags.scripts;
        console.log(scriptTags);
        this.usedLibrary.forEach(lib => {
          scriptTags.unshift({
            tagName: 'script',
            voidTag: false,
            meta: { plugin: this.pluginName },
            attributes: {
              defer: true,
              type: undefined,
              src: this.options[lib].src
            }
          });
        });
      });
    });
  }


  /**
   * @description 处理import逻辑
   * @param parser
   */
  importHandler(parser) {
    parser.hooks.import.tap(this.pluginName, (statement, source) => {
      if (this.transformLibrary.includes(source)) {
        this.usedLibrary.add(source);
      }
    });
  }

  /**
   * @description 处理require逻辑
   * @param parser
   */
  requireHandler(parser) {
    parser.hooks.call.for('require').tap(this.pluginName, expression => {
      console.log(expression);
      const moduleName = expression.arguments[0].value;
      if (this.transformLibrary.includes(moduleName)) {
        this.usedLibrary.add(moduleName);
      }
    });
  }
}

module.exports = ExternalWebpackPlugin;
