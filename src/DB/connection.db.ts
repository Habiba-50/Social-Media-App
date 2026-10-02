import { connect } from "mongoose"
import { DB_URI } from "../config/config"

export const connectDB = async () => { 
    try {
        await connect(DB_URI as string, { serverSelectionTimeoutMS: 30000 })
        console.log(" DB  connected successfully! 🌸");
    } catch (error) {
        console.error("Error connecting to database:", error);
    }
}