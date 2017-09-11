## 操作 MongoDb 时需要创建两个文件 model.js 和 modelDao.js
> 详细的介绍请查看[个人博客](http://www.jianshu.com/p/210d3f55af17)，欢迎您拍砖和 star。

 ### 一. 对于 Model.js 以下几部分：
 1. Schema 必要
 2. plugin 可选
 3. hook 可选
 4. 调用 mongoClient.model() 创建 Model，此处注意，Model 名称与 js 文件名一样，但首字母大写

 ### 二. 对于 modelDao.js
 我们需要声明一个 ModelDao 的 class 继承自 BaseDao， BaseDao 中包含基本的 crud 操作，也可以根据需求自行定义

 ### 三. 外部使用
     var dao = new ModelDao()
     dao.crud();

     