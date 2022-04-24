/**
 *
 * 统一路径分隔符 主要是为了后续生成模块ID方便
 * @param {*} path
 * @returns
 */
const fs = require('fs');

function toUnixPath(path) {
  return path.replace(/\\/g, '/');
}

/**
 * @description 尝试通过配置中的extensions去匹配没有后缀名的文件
 * @param {string} modulePath
 * @param {string[]} extensions
 * @param {string} originModulePath
 * @param {string} moduleContext
 */
function tryExtensions(modulePath, extensions, originModulePath, moduleContext) {
  if (fs.existsSync(modulePath)) return modulePath;
  for (let i = 0; i < extensions.length; i++) {
    const pathWithExtension = modulePath + extensions[i];
    if (fs.existsSync(pathWithExtension)) return pathWithExtension;
  }
  throw new Error(`No module: Can\'t resolve ${originModulePath} in ${moduleContext}`);
}

module.exports = { toUnixPath, tryExtensions };
