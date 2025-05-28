import Message from "../models/MessagesModel.js";
import { mkdirSync, renameSync } from 'fs';

export const getMessages = async (req, res) => { 
    try {

        const user1 = req.user.userId;
        const user2 = req.body.id;
        

        if(!user1 || !user2) {
           return res.status(400).json({ message: "User IDs are required" });
        }

        
        const messages = await Message.find({
            $or: [
                { sender: user1, recipient: user2 },
                { sender: user2, recipient: user1 },
            ]
        })
        .populate("sender", "_id email firstName lastName profileImage color")
        .populate("recipient", "_id email firstName lastName profileImage color")
        .sort({ timestamp: 1});


        return res.status(200).json({messages});

    } catch (error) {
        console.error("Error during getMessages:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const uploadFile = async (req, res) => { 
    try {

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        let sanitizedFileName = req.file.originalname
            .replace(/%/g, '')
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .toLowerCase();

        const date = Date.now();

        let fileDir = `uploads/files/${date}`;
        let fileName = `${fileDir}/${sanitizedFileName}`;

        mkdirSync(fileDir, { recursive: true });

        renameSync(req.file.path, fileName);

        return res.status(200).json({ filePath: fileName });

    } catch (error) {
        console.error("Error during getMessages:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}