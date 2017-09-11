# 关于 mongoose 使用，这一篇就够了
 
Node.js 中操作 MongoDB，相信首选的库肯定是 mongoose 了，但是实际项目中如果想要使用，还需要自己做封装。但是考虑到 mongoose 常常的文档，让好多人望而怯步。 笔者当时打算用 mongoose 的时候，网上转了一圈，发现多数就是抄抄官方文档，于是硬着头皮读了一遍官方文档，依据项目需求做了简要封装。  
mongoose 非常的漂亮，所以封装的过程也非常的简洁。[项目传送门](https://github.com/SethWen/MongooseLib)  
 笔者在撸码的时候，是将结构分成以下几部分：

* 连接层
* Model 层
* Dao 层
* 应用层

### 1. 连接层
代码先放下边了。代码里注释都已经很明白了，这里有几点需要注意下：  

1. 要是用 Node.js 自带的 Promise 替换 mongoose 中的 Promise，否则有时候会报警告
2. 关于 MongoDB 的所有配置，我引用了 config 库，配置都放在了 default.json 中
3. 在使用 `mongoose.createConnection()`，并不是简单创建了一个 mongo client，而是其内部创建了一个连接池，默认是维护了 5 个 client。 而这个连接池我们可以根据自己的硬件和需求情况自定义，只需要设置 `options` 中的 `poolSize` 参数即可。
4. 如果你是单机的 mongoDB，那么只需要配置 default.json 文件中的 `host` 和 `port`即可，**replicaSet 中的 `name` 字段 不要填写空串就好**
5. 如果你要使用 mongoDB 集群配置，那就要用到 `replicaSet`，此时填写 default.json 中相应的 `replicaSet` 配置即可。我在读取配置文件再做相应连接的时候逻辑都已经处理了。



		// mongo.js
		let mongoose = require('mongoose');
		let mongodbConfig = require('config').get('mongodb');
		
		/**
		 * debug 模式
		 */
		// mongoose.set('debug', true);
		
		/**
		 * 使用 Node 自带 Promise 代替 mongoose 的 Promise
		 */
		mongoose.Promise = global.Promise;
		
		// 配置 plugin。此处配置 plugin 的话是全局配置，推荐在 每个 Model 内 自己定义
		// mongoose.plugin(require('./plugin').updatedAt);
		
		
		/**
		 * 配置 MongoDb options
		 */
		function getMongoOptions() {
		    let options = {
		        useMongoClient: true,
		        poolSize: 5, // 连接池中维护的连接数
		        reconnectTries: Number.MAX_VALUE,
		        keepAlive: 120,
		    };
		
		    if (mongodbConfig.get('user')) options.user = mongodbConfig.get('user');
		    if (mongodbConfig.get('pass')) options.pass = mongodbConfig.get('pass');
		    if (mongodbConfig.get('replicaSet').get('name')) options.replicaSet = mongodbConfig.get('replicaSet').get('name');
		}
		
		
		/**
		 * 拼接 MongoDb Uri
		 *
		 * @returns {string}
		 */
		function getMongoUri() {
		    let mongoUri = 'mongodb://';
		    let dbName = mongodbConfig.get('db');
		    let replicaSet = mongodbConfig.get('replicaSet');
		    if (replicaSet.get('name')) { // 如果配置了 replicaSet 的名字 则使用 replicaSet
		        let members = replicaSet.get('members');
		        for (let member of members) {
		            mongoUri += `${member.host}:${member.port},`;
		        }
		        mongoUri = mongoUri.slice(0, -1); // 去掉末尾逗号
		    } else {
		        mongoUri += `${mongodbConfig.get('host')}:${mongodbConfig.get('port')}`;
		    }
		    mongoUri += `/${dbName}`;
		
		    return mongoUri;
		}
		
		
		/**
		 * 创建 Mongo 连接，内部维护了一个连接池，全局共享
		 */
		let mongoClient = mongoose.createConnection(getMongoUri(), getMongoOptions());
		
		/**
		 * Mongo 连接成功回调
		 */
		mongoClient.on('connected', function () {
		    console.log('Mongoose connected to ' + getMongoUri());
		});
		/**
		 * Mongo 连接失败回调
		 */
		mongoClient.on('error', function (err) {
		    console.log('Mongoose connection error: ' + err);
		});
		/**
		 * Mongo 关闭连接回调
		 */
		mongoClient.on('disconnected', function () {
		    console.log('Mongoose disconnected');
		});
		
		
		/**
		 * 关闭 Mongo 连接
		 */
		function close() {
		    mongoClient.close();
		}
		
		
		module.exports = {
		    mongoClient: mongoClient,
		    close: close,
		};

### 2. Model
这一层我以创建 book collection 举例。要创建一个 Model，我将它分成以下几部分
1. schema
2. plugin(后面单独再说这个)
3. hook
4. 最后通过 `mongoClient.model()` 创建出真正的 Model

		// book.js
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
### 3. Dao 层
这部分代码是 Dao 层的基类，封装了基本的 crud 操作，在实现它的时候传入对应的 Model 即可。可以参照项目中的 bookDao.js,如果不同的 dao 中需要定制不同的数据库操作，那么只需要在实现类中增加相应的方法即可。

		// baseDao.js
		class BaseDao {
		    /**
		     * 子类构造传入对应的 Model 类
		     *
		     * @param Model
		     */
		    constructor(Model) {
		        this.Model = Model;
		    }
		
		
		    /**
		     * 使用 Model 的 静态方法 create() 添加 doc
		     *
		     * @param obj 构造实体的对象
		     * @returns {Promise}
		     */
		    create(obj) {
		        return new Promise((resolve, reject) => {
		            let entity = new this.Model(obj);
		            this.Model.create(entity, (error, result) => {
		                if (error) {
		                    console.log('create error--> ', error);
		                    reject(error);
		                } else {
		                    console.log('create result--> ', result);
		                    resolve(result)
		                }
		            });
		        });
		    }
		
		
		    /**
		     * 使用 Model save() 添加 doc
		     *
		     * @param obj 构造实体的对象
		     * @returns {Promise}
		     */
		    save(obj) {
		        return new Promise((resolve, reject) => {
		            let entity = new this.Model(obj);
		            entity.save((error, result) => {
		                if (error) {
		                    console.log('save error--> ', error);
		                    reject(error);
		                } else {
		                    console.log('save result--> ', result);
		                    resolve(result)
		                }
		            });
		        });
		    }
		
		
		    /**
		     * 查询所有符合条件 docs
		     *
		     * @param condition 查找条件
		     * @param constraints
		     * @returns {Promise}
		     */
		    findAll(condition, constraints) {
		        return new Promise((resolve, reject) => {
		            this.Model.find(condition, constraints ? constraints : null, (error, results) => {
		                if (error) {
		                    console.log('findAll error--> ', error);
		                    reject(error);
		                } else {
		                    console.log('findAll results--> ', results);
		                    resolve(results);
		                }
		            });
		        });
		    }
		
		
		    /**
		     * 查找符合条件的第一条 doc
		     *
		     * @param condition
		     * @param constraints
		     * @returns {Promise}
		     */
		    findOne(condition, constraints) {
		        return new Promise((resolve, reject) => {
		            this.Model.findOne(condition, constraints ? constraints : null, (error, results) => {
		                if (error) {
		                    console.log('findOne error--> ', error);
		                    reject(error);
		                } else {
		                    console.log('findOne results--> ', results);
		                    resolve(results);
		                }
		            });
		        });
		    }
		
		
		    /**
		     * 查找排序之后的第一条
		     *
		     * @param condition
		     * @param orderColumn
		     * @param orderType
		     * @returns {Promise}
		     */
		    findOneByOrder(condition, orderColumn, orderType) {
		        return new Promise((resolve, reject) => {
		            this.Model.findOne(condition)
		                .sort({[orderColumn]: orderType})
		                .exec(function (err, record) {
		                    console.log(record);
		                    if (err) {
		                        reject(err);
		                    } else {
		                        resolve(record);
		                    }
		                });
		        });
		    }
		
		
		    /**
		     * 更新 docs
		     *
		     * @param condition 查找条件
		     * @param updater 更新操作
		     * @returns {Promise}
		     */
		    update(condition, updater) {
		        return new Promise((resolve, reject) => {
		            this.Model.update(condition, updater, (error, results) => {
		                if (error) {
		                    console.log('update error--> ', error);
		                    reject(error);
		                } else {
		                    console.log('update results--> ', results);
		                    resolve(results);
		                }
		            });
		        });
		
		        // this.model.findOneAndUpdate(condition, update, {new: true, upsert: true}, (err, record) => {
		        //     if (err) {
		        //         log.warn(`Failed updating database, condition: ${JSON.stringify(condition)}, update: ${JSON.stringify(update)}, error: ${err}`);
		        //         reject(err);
		        //     } else {
		        //         log.info(`Database updated for ${JSON.stringify(condition)} with ${JSON.stringify(update)}`);
		        //         resolve(record);
		        //     }
		        // });
		    }
		
		
		    /**
		     * 移除 doc
		     *
		     * @param condition 查找条件
		     * @returns {Promise}
		     */
		    remove(condition) {
		        return new Promise((resolve, reject) => {
		            this.Model.remove(condition, (error, result) => {
		                if (error) {
		                    console.log('remove error--> ', error);
		                    reject(error);
		                } else {
		                    console.log('remove result--> ', result);
		                    resolve(result);
		                }
		            });
		        });
		    }
		}


		module.exports = BaseDao;

### 4. 外部调用
new 对应的 dao 实例，然后调用对应的数据库操作就好了

		let bookDao = new BookDao();
		bookDao.crud();
		
### 5. plugin
在不同的 collection 中可能会有一些通用的操作，这时候，我们就可以把这种操作封装进 plugin 中。 比如 doc 的 插入时间和更改时间。下面是一个例子：

		/**
		 * doc 创建时间 plugin。其中在 插入一条 doc 时 同时创建 createdAt 和 updateAt 字段
		 *
		 * @param schema
		 * @param options
		 */
		function createdAt(schema, options) {
		    schema.add({createdAt: Date});
		    schema.add({updatedAt: Date});
		
		    schema.pre('save', function (next) {
		        let now = Date.now();
		        this.createdAt = now;
		        this.updatedAt = now;
		        next();
		    });
		
		    if (options && options.index) {
		        schema.path('createdAt').index(options.index);
		        schema.path('updatedAt').index(options.index);
		    }
		}
		
		
		/**
		 * doc 更新时间 plugin
		 *
		 * @param schema
		 * @param options
		 */
		function updatedAt(schema, options) {
		    schema.pre('update', function (next) {
		        this.update({}, {$set: {updatedAt: new Date()}});
		        next();
		    });
		
		    if (options && options.index) {
		        schema.path('updatedAt').index(options.index);
		    }
		}
		
		
		module.exports = {
		    createdAt: createdAt,
		    updatedAt: updatedAt,
		};

### 最后上一次[项目传送门](https://github.com/SethWen/MongooseLib)，感谢您的阅读，也欢迎您的指正。
