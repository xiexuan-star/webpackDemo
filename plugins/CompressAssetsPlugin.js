const JSZip = require('jszip');

// 一个 webpack 内置库，它的内部包含了 Source 等一系列基于 Source 的子类对象
const { RawSource } = require('webpack-sources');

class CompressAssetsPlugin {
  pluginName = 'CompressAssetsPlugin';

  constructor({ output }) {
    this.output = output;
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync(this.pluginName, (compilation, callback) => {
      // 创建zip对象
      const zip = new JSZip();
      // 获取assets
      const assets = compilation.getAssets();
      // 循环每一个资源
      assets.forEach(({ name, source }) => {
        // 调用source()方法获得对应的源代码 这是一个源代码的字符串
        const sourceCode = source.source();
        // 往 zip 对象中添加资源名称和源代码内容
        zip.file(name, sourceCode);
      });
      zip.generateAsync({ type: 'nodebuffer' }).then(result => {
        compilation.emitAsset(this.output, new RawSource(result));
        callback();
      });
    });
  }
}

module.exports = CompressAssetsPlugin;
