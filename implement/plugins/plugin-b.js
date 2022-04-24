class PluginB {
  apply(compiler) {
    compiler.hooks.done.tap('pluginB', () => {
      console.log('done=>pluginB');
    });
  }
}

module.exports = PluginB;
