import {
  AnyKeys,
  CreateOptions,
  DeleteResult,
  FlattenMaps,
  HydratedDocument,
  Model,
  MongooseUpdateQueryOptions,
  PopulateOptions,
  ProjectionType,
  QueryFilter,
  QueryOptions,
  Types,
  UpdateQuery,
  UpdateWithAggregationPipeline,
  UpdateWriteOpResult,
} from "mongoose";
import { IPaginate } from "../../common/interfaces";

export class DatabaseRepository<TRawDocument> {
  constructor(protected readonly model: Model<TRawDocument>) {}

  // ----------------------------------------Create method overloads----------------------------------------

  async create({
    data,
    options,
  }: {
    data: AnyKeys<TRawDocument>;
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TRawDocument>>;

  // Overload 2 - array → ترجع array
  async create({
    data,
    options,
  }: {
    data: AnyKeys<TRawDocument>[];
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TRawDocument>[]>;

  // Implementation
  async create({
    data,
    options,
  }: {
    data: AnyKeys<TRawDocument> | AnyKeys<TRawDocument>[];
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TRawDocument> | HydratedDocument<TRawDocument>[] | undefined> {
    if (Array.isArray(data)) {
      // Array input → return array
      return await this.model.create(data as any, options) as HydratedDocument<TRawDocument>[];
    }
    // Single object → wrap in array so mongoose returns an array, then unwrap
    const [result] = await this.model.create([data] as any, options) as HydratedDocument<TRawDocument>[];
    return result;
  }



  // // Create without options
  // async create({
  //   data,
  // }: {
  //   data: AnyKeys<TRawDocument>;
  // }): Promise<HydratedDocument<TRawDocument>[]>;

  // // Create with options
  // async create({
  //   data,
  //   options,
  // }: {
  //   data: AnyKeys<TRawDocument>[];
  //   options?: CreateOptions | undefined;
  // }): Promise<HydratedDocument<TRawDocument>[]>;

  // // Create with implementation
  // async create({
  //   data,
  //   options,
  // }: {
  //   data: AnyKeys<TRawDocument>[];
  //   options?: CreateOptions | undefined;
  // }): Promise<HydratedDocument<TRawDocument>[]> {
  //   const result = await this.model.create(data as any, options);
  //   return result;
  // }

  // Create One
  // async createOne({
  //   data,
  //   options = {},
  // }: {
  //   data: AnyKeys<TRawDocument>;
  //   options?: CreateOptions | undefined;
  //   }): Promise<HydratedDocument<TRawDocument>> {

  //   const [user] = (await this.create({ data: [data], options })) || [];
  //   return user as HydratedDocument<TRawDocument>;
  // }

  // ----------------------------------------InsertMany method----------------------------------------

  async insertMany({
    data
  }: {
    data: AnyKeys<TRawDocument>[]
  }): Promise<HydratedDocument<TRawDocument>[]> {
    return await this.model.insertMany(data as any) as HydratedDocument<TRawDocument>[]
  }

  // ----------------------------------------Find method overloads----------------------------------------

  // Find One & lean:true
  async findOne({
    filter,
    projection,
    options,
  }: {
    filter: QueryFilter<TRawDocument>;
    projection?: ProjectionType<TRawDocument> | null | undefined;
    options: QueryOptions<TRawDocument> & { lean: true };
  }): Promise<FlattenMaps<TRawDocument> | null>;

  // Find One & lean:false (default)
  async findOne({
    filter,
    projection,
    options,
  }: {
    filter: QueryFilter<TRawDocument>;
    projection?: ProjectionType<TRawDocument> | null | undefined;
    options?: QueryOptions<TRawDocument>;
  }): Promise<HydratedDocument<TRawDocument> | null>;

  // Find One implementation
  async findOne({
    filter = {},
    projection,
    options,
  }: {
    filter: QueryFilter<TRawDocument>;
    projection?: ProjectionType<TRawDocument> | null | undefined;
    options?: QueryOptions<TRawDocument>;
  }): Promise<
    FlattenMaps<TRawDocument> | HydratedDocument<TRawDocument> | null
  > {
    let doc = this.model.findOne(filter, projection, options);

    if (options?.populate) {
       doc.populate(options.populate as PopulateOptions);
    }
    if (options?.lean) {
       doc.lean(options.lean) as any;
    }
    return await doc.exec();
  }
  // ----------------------------------------- Find ------------------------------------

  async findAll({
    filter = {},
    projection,
    options,
  }: {
    filter?: QueryFilter<TRawDocument>;
    projection?: ProjectionType<TRawDocument> | null | undefined;
    options?: QueryOptions<TRawDocument>;
  }): Promise<
    FlattenMaps<TRawDocument>[] | HydratedDocument<TRawDocument>[] | null
  > {
    let doc = this.model.find(filter, projection, options);

    if (options?.populate) {
       doc.populate(options.populate as PopulateOptions);
    }
    if (options?.lean) {
       doc.lean(options.lean) as any;
    }
    return await doc.exec();
  }

  // ---------------------------------------- Paginate -----------------------------------

  async paginate({
    filter ,
    projection,
    options = {},
    page = 0,
    size = 5,
  }: {
    filter?: QueryFilter<TRawDocument>;
    projection?: ProjectionType<TRawDocument> | null | undefined;
    options?: QueryOptions<TRawDocument>;
    page?: number | string | undefined;
    size?: number | string | undefined;
  }): Promise<IPaginate<TRawDocument>> {    
    
    let count: number = -1
    
    if (Number(page) > 0) {
      page = Number(page);
      size = Number(size);
      options.skip = (page - 1) * size;
      options.limit = size;
      count = await this.model.countDocuments(filter || {}) as number;
    }
    
    const docs = await this.findAll({filter: filter || {} , projection, options});

    return {
      docs: docs as HydratedDocument<TRawDocument>[],
      ...(Number(page) > 0 ? { currentPage: Number(page), pageSize: Number(size), pages: Math.ceil(count / Number(size)) } : {})
    };
  }

 

  // ----------------------------------------Find BY ID -----------------------------------

  // Find By Id & lean:true
  async findById({
    _id,
    projection,
    options,
  }: {
    _id: Types.ObjectId;
    projection?: ProjectionType<TRawDocument> | null | undefined;
    options: QueryOptions<TRawDocument> & { lean: true };
  }): Promise<FlattenMaps<TRawDocument> | null>;

  // Find By Id & lean:false (default)
  async findById({
    _id,
    projection,
    options,
  }: {
    _id: Types.ObjectId;
    projection?: ProjectionType<TRawDocument> | null | undefined;
    options?: QueryOptions<TRawDocument>;
  }): Promise<HydratedDocument<TRawDocument> | null>;

  async findById({
    _id,
    projection,
    options,
  }: {
    _id: Types.ObjectId;
    projection?: ProjectionType<TRawDocument> | null | undefined;
    options?: QueryOptions<TRawDocument>;
  }): Promise<
    HydratedDocument<TRawDocument> | FlattenMaps<TRawDocument> | null
  > {
    let doc = this.model.findById(_id, projection);
    if (options?.populate) {
     doc.populate(options.populate as PopulateOptions);
    }
    if (options?.lean) {
       doc.lean(options.lean);
    }
    return await doc.exec();
  }

// ------------------------------- Find & Update / Find & Delete -------------------------------

  // find one and update
  async findOneAndUpdate({
    filter = {},
    update,
    options,
  }: {
    filter: QueryFilter<TRawDocument>;
    update: UpdateQuery<TRawDocument> | UpdateWithAggregationPipeline;
    options?: QueryOptions<TRawDocument>;
    }): Promise<HydratedDocument<TRawDocument> | null> {
    if (Array.isArray(update)) {
       return await this.model.findOneAndUpdate(filter, update, { new: true, ...options, updatePipeline:true });
    }
    return await this.model.findOneAndUpdate(filter, { ...update, $inc: { __v: 1 } }, { new: true, ...options });
  }

  // find one and delete
  async findOneAndDelete({
    filter = {},
    options,
  }: {
    filter: QueryFilter<TRawDocument>;
    options?: QueryOptions<TRawDocument>;
  }): Promise<HydratedDocument<TRawDocument> | null> {
    return await this.model.findOneAndDelete(filter, options);
  }

  // Find By Id And Delete
  async findByIdAndDelete({
    _id,
    options,
  }: {
    _id: Types.ObjectId;
    options?: QueryOptions<TRawDocument> | undefined;
  }): Promise<HydratedDocument<TRawDocument> | null> {
    const result = await this.model.findByIdAndDelete(_id, options);
    return result;
  }

  // ----------------------------------------Update method overloads----------------------------------------

  // Update one
  async updateOne({
    filter = {},
    update,
    options,
  }: {
    filter: QueryFilter<TRawDocument>;
    update: UpdateQuery<TRawDocument> | UpdateWithAggregationPipeline;
    options?: MongooseUpdateQueryOptions<TRawDocument>;
  }): Promise<UpdateWriteOpResult> {
    const result = await this.model.updateOne(filter, { ...update, $inc: { __v: 1 } }, options);
    return result;
  }

  // Update Many
  async updateMany({
    filter = {},
    update,
    options,
  }: {
    filter: QueryFilter<TRawDocument>;
    update: UpdateQuery<TRawDocument> | UpdateWithAggregationPipeline;
    options?: MongooseUpdateQueryOptions<TRawDocument>;
  }): Promise<UpdateWriteOpResult> {
    return await this.model.updateMany(filter, { ...update, $inc: { __v: 1 } }, options);
  }

  // Update By Id
  async updateById({
    _id,
    update,
    options,
  }: {
    _id: Types.ObjectId;
    update: UpdateQuery<TRawDocument> | UpdateWithAggregationPipeline;
    options?: MongooseUpdateQueryOptions<TRawDocument>;
  }): Promise<UpdateWriteOpResult> {
    return await this.model.updateOne({ _id }, { ...update, $inc: { __v: 1 } }, options);
  }

  // Find By Id And Update
  async findByIdAndUpdate({
    _id,
    update,
    options,
  }: {
    _id: Types.ObjectId;
    update: UpdateQuery<TRawDocument>;
    options?: QueryOptions<TRawDocument> | undefined;
  }): Promise<HydratedDocument<TRawDocument> | null> {
    const result = await this.model.findByIdAndUpdate(_id, update, options);
    return result;
  }

  // ----------------------------------------Delete method overloads----------------------------------------

  // Delete One
  async deleteOne({
    filter = {},
    options,
  }: {
      filter: QueryFilter<TRawDocument>;
      options?: QueryOptions<TRawDocument>;
  }): Promise<DeleteResult> {
    return await this.model.deleteOne(filter, options as any);
  }

  // Delete Many
  async deleteMany({
    filter = {},
    options,
  }: {
    filter: QueryFilter<TRawDocument>;
    options?: QueryOptions<TRawDocument>;
  }): Promise<DeleteResult> {
    return await this.model.deleteMany(filter, options as any);
  }

  // Delete By Id
  async deleteById({ _id }: { _id: Types.ObjectId }): Promise<DeleteResult> {
    return await this.model.deleteOne({ _id });
  }


  // Aggregate — generic passthrough for complex pipelines (e.g. cross-field
  // sorting/filtering on embedded arrays) that the simpler helpers above can't express.
  async aggregate<TResult = any>(pipeline: any[]): Promise<TResult[]> {
    return await this.model.aggregate(pipeline);
  }
}
