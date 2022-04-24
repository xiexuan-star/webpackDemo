## a basic webpack implement

### 1 插件系统

#### 1.1 插件中可以注册hook的对象

#### 1.1.1 compiler

每次编译唯一

通过compiler.options 可以访问全部的webpack配置

通过compiler.inputFileSystem/outputFileSystem 可以访问 获取/输出 文件相关api对象

通过hooks可以访问从tapable中注册的所有钩子

#### 1.1.2 compilation

每次资源创建对应一个新的compilation对象

可以访问所有模块和其对应的依赖

在编译阶段, 模块被load(加载),seal(封存),optimize(优化),chunk(分块),hash(哈希),restore(重建)

几个主要的属性

modules {Set} 一个文件就是一个模块

chunks {Map} 多个modules组成的代码块

assets {Map} 本次打包生成的所有文件

对于这些资源文件,webpack在compilation实例上提供了对应的api, 如emitAsset等

hooks compilation上挂载的tapableHook

#### 1.1.3 ContextModuleFactory

用于webpack独有的require.context语法解析文件目录时进行处理

#### 1.1.4 JavascriptParser

用于介入babel的解析过程, 通过hook访问目标类型的节点然后进行修改/替换等

#### 1.1.5 NormalModuleFactory

从入口开始, NormalModuleFactory会分解每个模块请求, 解析文件内容以查找进一步的请求

通过该对象可以介入webpack对模块引用时的处理
