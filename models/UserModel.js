import mongoose from "mongoose";
import  {genSalt, hash} from "bcrypt";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: false,
    },
    lastName: {
        type: String,
        required: false,
    },
    profileImage: {
        type: String,
        required: false,
    },
    color: {
        type: Number,
        required: false,
    },
    profileSetup: {
        type: Boolean,
        required: false,
    },
    // role: {
    //     type: String,
    //     enum: ["user", "admin"],
    //     default: "user",
    // },
}, { timestamps: true });

userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) {
        return next();
    }
    
    const salt = await genSalt();
    this.password = await hash(this.password, salt);
    next();
});

const User = mongoose.model("User", userSchema);

export default User;