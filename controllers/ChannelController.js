import mongoose from "mongoose";
import Channel from "../models/ChannelModel.js";
import User from "../models/UserModel.js";

export const CreateChannel = async (req, res, api) => {
    try {
        const { name, members } = req.body;
        const userId = req.user.userId;

        const admin = await User.findById(userId);

        if (!admin) {
            return res.status(400).send("Admin user not found");
        }

        const validMembers = await User.find({ _id: { $in: members } });
        if (validMembers.length !== members.length) {
            return res.status(400).send("Some members are not valid users.");
        }

        const newChannel = new Channel({
            name,
            members,
            admin: userId,
        });

        await newChannel.save();
        return res.status(201).json({ channel: newChannel });
    } catch (e) {
        console.log({ e });
        return res.status(500).send("Internal server error.");
    }
}

export const getUserChannels = async (req, res, api) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        
        const channels = await Channel.find({
            $or: [{ admin: userId }, { members: userId }],
        }).sort({ updatedAt: -1 });

        return res.status(201).json({ channel: channels });
    } catch (e) {
        console.log({ e });
        return res.status(500).send("Internal server error.");
    }
}

export const getChannelMessages = async (req, res, api) => {
    try {

        const { channelId } = req.params;
        const channel = await Channel.findById(channelId).populate({
            path: "messages",
            populate: {
                path: "sender",
                select: "firstName lastName email _id profileImage color",
            },
        });
        if (!channel) {
            return response.status(404).send("Channel not found.");
        }
    
        const messages = channel.messages;
        return res.status(201).json({ messages });
    } catch (e) { 
        console.log({ e });
        return res.status(500).send("Internal server error.");
    }
}