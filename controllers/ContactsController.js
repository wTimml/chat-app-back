import mongoose from "mongoose";
import User from "../models/UserModel.js";
import Message from "../models/MessagesModel.js"

export const searchContacts = async (req, res) => { 
    try {
        
        const {searchValue} = req.body;

        if(searchValue === undefined || searchValue === null) {
            return response.status(400).send("searchValue is required.");
        }

        const sanitizedSearchValue = searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        
        const regex = new RegExp(sanitizedSearchValue, "i");

        
        const contacts = await User.find({
            $and: [
                { _id: { $ne: req.user.userId } }, 
                { $or: [
                { firstName: { $regex: regex } },
                { lastName: { $regex: regex } },
                { email: { $regex: regex } }
            ] }],
            
        });

        return res.status(200).json({contacts});    

    } catch (error) {
        console.error("Error during searchContacts:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getContactsForDMList = async (req, res) => { 
    try {
        
        let userId = req.user.userId;

        userId = new mongoose.Types.ObjectId(userId);

        const contacts = await Message.aggregate([
            {
                $match: {
                    $or: [{sender: userId}, {recipient: userId}],
                },
            },
            {
                $sort: { timestamp: -1 },
            },
            {
                $group: {
                    _id: {
                        $cond: {
                            if: { $eq: ["$sender", userId]},
                            then: "$recipient",
                            else: "$sender",
                        },
                    },
                    lastMessageTime: { $first: "$timestamp" },
                },
            },
            { 
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "contactInfo"
                },
            },
            {
                $unwind: "$contactInfo",
            },
            {
                $project: {
                    _id: 1,
                    lastMessageTime: 1,
                    email: "$contactInfo.email",
                    firstName: "$contactInfo.firstName",
                    lastName: "$contactInfo.lastName",
                    profileImage: "$contactInfo.profileImage",
                    color: "$contactInfo.color",
                },
            },
            {
                $sort: { lastMessageTime: -1 },
            }
        ])

        return res.status(200).json({contacts});    

    } catch (error) {
        console.error("Error during getContactsForDm:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getAllContacts = async (req, res) => { 
    try {
        
        const users = await User.find({
            _id: { $ne: req.user.userId } // Exclude the current user
        },
        "firstName lastName email profileImage color"
        );

        const contacts = users.map((user) => ({
            label: user.firstName ? `${user.firstName} ${user.lastName}` : user.email,
            value: user._id
        })); 

        return res.status(200).json({contacts});    

    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}