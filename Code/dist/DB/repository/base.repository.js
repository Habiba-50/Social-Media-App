"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseRepository = void 0;
class DatabaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async create({ data, options, }) {
        if (Array.isArray(data)) {
            return await this.model.create(data, options);
        }
        const [result] = await this.model.create([data], options);
        return result;
    }
    async insertMany({ data }) {
        return await this.model.insertMany(data);
    }
    async findOne({ filter = {}, projection, options, }) {
        let doc = this.model.findOne(filter, projection, options);
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async findAll({ filter = {}, projection, options, }) {
        let doc = this.model.find(filter, projection, options);
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async paginate({ filter, projection, options = {}, page = 0, size = 5, }) {
        let count = -1;
        if (Number(page) > 0) {
            page = Number(page);
            size = Number(size);
            options.skip = (page - 1) * size;
            options.limit = size;
            count = await this.model.countDocuments(filter || {});
        }
        const docs = await this.findAll({ filter: filter || {}, projection, options });
        return {
            docs: docs,
            ...(Number(page) > 0 ? { currentPage: Number(page), pageSize: Number(size), pages: Math.ceil(count / Number(size)) } : {})
        };
    }
    async findById({ _id, projection, options, }) {
        let doc = this.model.findById(_id, projection);
        if (options?.populate) {
            doc.populate(options.populate);
        }
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async findOneAndUpdate({ filter = {}, update, options, }) {
        if (Array.isArray(update)) {
            return await this.model.findOneAndUpdate(filter, update, { new: true, ...options, updatePipeline: true });
        }
        return await this.model.findOneAndUpdate(filter, { ...update, $inc: { __v: 1 } }, { new: true, ...options });
    }
    async findOneAndDelete({ filter = {}, options, }) {
        return await this.model.findOneAndDelete(filter, options);
    }
    async findByIdAndDelete({ _id, options, }) {
        const result = await this.model.findByIdAndDelete(_id, options);
        return result;
    }
    async updateOne({ filter = {}, update, options, }) {
        const result = await this.model.updateOne(filter, { ...update, $inc: { __v: 1 } }, options);
        return result;
    }
    async updateMany({ filter = {}, update, options, }) {
        return await this.model.updateMany(filter, { ...update, $inc: { __v: 1 } }, options);
    }
    async updateById({ _id, update, options, }) {
        return await this.model.updateOne({ _id }, { ...update, $inc: { __v: 1 } }, options);
    }
    async findByIdAndUpdate({ _id, update, options, }) {
        const result = await this.model.findByIdAndUpdate(_id, update, options);
        return result;
    }
    async deleteOne({ filter = {}, options, }) {
        return await this.model.deleteOne(filter, options);
    }
    async deleteMany({ filter = {}, options, }) {
        return await this.model.deleteMany(filter, options);
    }
    async deleteById({ _id }) {
        return await this.model.deleteOne({ _id });
    }
    async aggregate(pipeline) {
        return await this.model.aggregate(pipeline);
    }
}
exports.DatabaseRepository = DatabaseRepository;
