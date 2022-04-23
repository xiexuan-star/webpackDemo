const Compiler = require('./compiler');

function webpack(options) {
  // 合并参数
  const mergeOptions = _mergeOptions(options);

  // 创建compiler对象
  const compiler = new Compiler(mergeOptions);

  _loadPlugin(options.plugins, compiler);
  return { compiler };
}

function _loadPlugin(plugins, compiler) {
  Array.isArray(plugins) && compiler.options.plugins.forEach(plugin => {
    // plugin的本质其实时操作compiler对象进而影响编译结果
    plugin.apply(compiler);
  });
}

// 合并shell命令中的option，通过process.argv
function _mergeOptions(options) {
  const shellOptions = process.argv.reduce((option, argv) => {
    // slice(2) 将--剔除
    // argv -> --mode=production
    const [key, value] = argv.slice(2).split('=');
    if (key && value) {
      const parseKey = key.slice(2);
      option[parseKey] = value;
    }
    return option;
  }, {});
  return Object.assign({}, options, shellOptions);
}

module.exports = webpack;
