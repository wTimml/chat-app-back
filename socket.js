import { Server as SockerIOServer } from "socket.io";
import Message from "./models/MessagesModel.js";
import Channel from "./models/ChannelModel.js";

const setupSocket = (server) => {
    const io = new SockerIOServer(server, {
        cors: {
            origin: process.env.ORIGIN,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Maintains a map of userId -> socketId
    const userSocketMap = new Map();

    // Functions:
    // 1. disconnect: Removes user from map when they disconnect
    // 2. sendMessage: Handles message creation and delivery
    // 3. connection: Manages new socket connections

    const disconnect = (socket) => {
        // console.log("Client disconnected");

        for (const [userId, socketId] of userSocketMap.entries()) {
            if (socketId === socket.id) {
                userSocketMap.delete(userId);
                // console.log(`User ${userId} disconnected`);
                break;
            }
        }
    }
    const sendMessage = async (message) => {
        const senderSocketId = userSocketMap.get(message.sender);
        const recipientSocketId = userSocketMap.get(message.recipient);

        const createdMessage = await Message.create(message);

        const messageData = await Message.findById(createdMessage._id)
        .populate("sender", "_id email firstName lastName profileImage color")
        .populate("recipient", "_id email firstName lastName profileImage color");

        if (recipientSocketId) { // If recipient is online
            io.to(recipientSocketId).emit("receiveMessage", messageData);
        }
        if (senderSocketId) { // If sender is online
            io.to(senderSocketId).emit("receiveMessage", messageData);
        }

    };

    const sendChannelMessage = async (message) => {
        const { channelId, sender, content, messageType, fileUrl } = message;

        const createdMessage = await Message.create({
            sender,
            recipient: null,
            content,
            messageType,
            timestamp: new Date(),
            fileUrl,
        });

        const messageData = await Message.findById(createdMessage._id).populate(
            "sender",
            "_id email firstName lastName color profileImage"
        ).exec();

        await Channel.findByIdAndUpdate(channelId, {
            $push: { messages: createdMessage._id },
        });

        const channel = await Channel.findById(channelId).populate("members");

        const finalData = { ...messageData._doc, channelId: channel._id };

        if (channel && channel.members) {
            channel.members.forEach((member) => {
                const memberSocketId = userSocketMap.get(member._id.toString());
                if (memberSocketId) {
                    io.to(memberSocketId).emit("receive-channel-message", finalData);
                }

                
            });
            const adminSocketId = userSocketMap.get(channel.admin.toString());
            if (adminSocketId) {
                io.to(adminSocketId).emit("receive-channel-message", finalData);
            }
        }
    }

    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        if (userId) {
            // console.log("userId", socket.handshake.query.userId)
            userSocketMap.set(userId, socket.id);
            // console.log(`User ${userId} connected with socket ID: ${socket.id}`);
        } else {
            console.log("User ID not provided in handshake query");
        }

        socket.on("sendMessage", sendMessage)
        socket.on("send-channel-message", sendChannelMessage)
        socket.on("disconnect", () => {
            disconnect(socket)
        });
    });
}

export default setupSocket;