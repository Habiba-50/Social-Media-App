import { model, models, Schema } from "mongoose";
import { IUser } from "../../common/interfaces";
import { GenderEnum, ProviderEnum, RoleEnum } from "../../common/enums";
import { encrypt, generateHash } from "../../common/utils";


const userSchema = new Schema<IUser>({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    email: { type: String, required: true, unique: true },
    password: {
        type: String,
        required: function (this: IUser) {
            return this.provider == ProviderEnum.SYSTEM;
         }
    },

    bio: { type: String },

    phone: { type: String },
    profilePicture: { type: String },
    profileCoveredPictures: { type: [String] },

    // friends: [{type:Types.ObjectId, ref:'User'}],

    gender: { type: Number, enum: GenderEnum, default: GenderEnum.MALE },
    role: { type: Number, enum: RoleEnum, default: RoleEnum.USER },
    provider: { type: Number, enum: ProviderEnum, default: ProviderEnum.GOOGLE },

    changeCredentialsTime: { type: Date },
    DOB: { type: Date },
    confirmEmail: { type: Date },

    deletedAt: { type: Date},
    restoredAt: { type: Date },

    followingCount: { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    friendsCount: { type: Number, default: 0 },


}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strict: true,
    strictQuery: true,
    collection: 'SOCIAL_MEDIA_APP_USERS'
})


userSchema.virtual('username').set(function (value: string) {
    const [firstName, lastName] = value.split(" ")
    this.firstName = firstName as string
    this.lastName = lastName as string
}).get(function (this: IUser) {
    return `${this.firstName} ${this.lastName}`
})


userSchema.pre("save", async function () {
    if (this.isModified("password")) {
       this.password = await generateHash({plaintext: this.password })
   }
    if (this.isModified("phone") && this.phone) {
        this.phone = await encrypt(this.phone!)
    }
})
  
userSchema.post("save", async function () {
    // console.log(this);
})


userSchema.pre(["deleteOne", "findOneAndDelete"], function () {

    const query = this.getQuery()
    const { force, ...restQuery } = query

    if (force === true) {
        // Hard delete: remove the `force` field so MongoDB doesn't try to match it
        this.setQuery(restQuery)
    } else {
        // Soft-delete guard: only delete documents that are already soft-deleted
        this.setQuery({ deletedAt: { $exists: true }, ...restQuery })
    }

})

// userSchema.post(["updateOne", "findOneAndUpdate"], function () {
//     console.log("The Update",this.getUpdate());
// })


// userSchema.pre(["updateOne", "findOneAndUpdate"], function () {

//     const query = this.getQuery()

//     this.setQuery({ ...query, deletedAt: { $exists: false } })

//     console.log(this.getQuery());

// })

export const UserModel = models.User || model<IUser>('User', userSchema)
