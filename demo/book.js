/**
 * author: Shawn
 * time  : 2017/8/31 10:43
 * desc  : Book Schema 和 Model
 * update: Shawn 2017/8/31 10:43
 */


let {Schema} = require('mongoose');
let {mongoClient} = require('../lib/mongo');


/**
 * 操作 MongoDb 时需要创建两个文件 model.js 和 modelDao.js
 *
 * 一. 对于 Model.js 以下几部分：
 * 1. Schema 必要
 * 2. plugin 可选
 * 3. hook 可选
 * 4. 调用 mongoClient.model() 创建 Model，此处注意，Model 名称与 js 文件名一样，但首字母大写
 *
 * 二. 对于 modelDao.js
 * 我们需要声明一个 ModelDao 的 class 继承自 BaseDao， BaseDao 中包含基本的 crud 操作，也可以根据需求自行定义
 *
 * 三. 外部使用
 * var dao = new ModelDao()
 * dao.crud();
 */


const bookSchema = new Schema(
    {
        title: String,
        author: {type: String, lowercase: true}, // lowercase 都属于 setters
    },
    {
        runSettersOnQuery: true // 查询时是否执行 setters
    }
);


/**
 * 配置 plugin
 */
// (function () {
//     let plugin = require('./plugin');
//     bookSchema.plugin(plugin.createdAt);
//     bookSchema.plugin(plugin.updatedAt);
// })();


/**
 * 配置 hook
 */
// (function () {
//     bookSchema.pre('update', function (next) {
//         console.log('pre update');
//         next();
//     });
//
//     bookSchema.post('update', function (result, next) {
//         console.log('post update', result);
//         next();
//     });
//
//     bookSchema.pre('save', function (next) {
//         console.log('--------pre1------');
//         next();
//     });
//
//     bookSchema.pre('save', function (next) {
//         console.log('--------pre2------');
//         next(); // 如果有下一个 pre(), 则执行下一个 pre(), 否则 执行 save()
//     });
//     bookSchema.post('save', function (result, next) {
//         console.log('---------post1----------', result);
//         next();
//     });
//
//     bookSchema.post('save', function (result, next) {
//         console.log('---------post2----------', result);
//         next(); // 如果有下一个 post(), 则执行下一个 post(), 否则 结束
//     });
// })();


/**
 * 参数一要求与 Model 名称一致
 * 参数二为 Schema
 * 参数三为映射到 MongoDB 的 Collection 名
 */
let Book = mongoClient.model(`Book`, bookSchema, 'book');

module.exports = Book;