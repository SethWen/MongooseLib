/**
 * author: Shawn
 * time  : 2017/8/31 10:03
 * desc  : mongoose plugin
 * update: Shawn 2017/8/31 10:03
 */


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