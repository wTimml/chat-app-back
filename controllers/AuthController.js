import { response } from "express";
import User from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import { compare } from "bcrypt";
import { renameSync, unlinkSync } from "fs";

const maxAge = 3 * 24 * 60 * 60; // 3 days in seconds

const createToken = (email, userId) => {
    const secret = process.env.JWT_KEY;

    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return jwt.sign({ email, userId }, secret, {
        expiresIn: maxAge,
    });
}

export const signup = async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Email and Password is required" });
        }

        const user = await User.create({
            email,
            password,
            profileSetup: false,
        });

        res.cookie("jwt", createToken(user.email, user._id), {
            secure: true,
            sameSite: "none",
            httpOnly: true,
            maxAge: maxAge * 1000,
        });
        return res.status(201).json({
            user: {
                id: user._id,
                email: user.email,
                // firstName: user.firstName,
                // lastName: user.lastName,
                // profileImage: user.profileImage,
                // color: user.color,
                profileSetup: user.profileSetup,
            },
            token: createToken(user.email, user._id),
        });

    } catch (error) {
        if(error.code === 11000) {
            return res.status(400).json({ message: "User already exists" });
        }

        console.error("Error during signup:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Email and Password are required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials: User not found" });
        }

        const isMatch = await compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials: Wrong password" });
        }

        res.cookie("jwt", createToken(user.email, user._id), {
            secure: true,
            sameSite: "none",
            httpOnly: true,
            maxAge: maxAge * 1000,
        });

        return res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                // firstName: user.firstName,
                // lastName: user.lastName,
                // profileImage: user.profileImage,
                // color: user.color,
                profileSetup: user.profileSetup,
            },
            token: createToken(user.email, user._id),
        });
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getUserInfo = async (req, res) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decoded = jwt.verify(token, process.env.JWT_KEY);

        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImage: user.profileImage,
            color: user.color,
            profileSetup: user.profileSetup,
        });
    } catch (error) {
        console.error("Error fetching user info:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const updateProfile = async (req, res) => { 
    try {
        const { user } = req;
        const { firstName, lastName, profileImage, selectedColor } = req.body;

        if(!firstName || !lastName) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const color = selectedColor;

        const userData = await User.findByIdAndUpdate(user.userId, {
            firstName,
            lastName,
            color,
            profileSetup: true,
        }, { new: true, runValidators: true });
        
        return res.status(200).json({
            id: userData._id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            color: userData.color,
            profileSetup: userData.profileSetup,
        });

    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const addProfileImage = async (req, res) => { 
    try {

        if (!req.file ) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        
        const date = Date.now();
        let fileName = "uploads/profiles/" + date + "-" + req.file.originalname;
        renameSync(req.file.path, fileName);

        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { profileImage: fileName },
            { new: true, runValidators: true }
        );

        
        return res.status(200).json({
            profileImage: updatedUser.profileImage,
        });

    } catch (error) {
        console.error("Error updating profile image:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteProfileImage = async (req, res) => { 
    try {
        const { user } = req;
        
        const userFind = await User.findById(user.userId);

        if (!userFind) {
            return res.status(404).json({ message: "User not found" });
        }

        if (userFind.profileImage) {
            unlinkSync(userFind.profileImage);
        }

        userFind.profileImage = undefined;
        
        await userFind.save();
        
        return res.status(200).send("Profile image deleted successfully");

    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const logout = async (req, res) => { 
    try {
        
        res.cookie("jwt", "", {
            maxAge: 1,
            secure: true,
            sameSite: "none",
            httpOnly: true,
        });
        return res.status(200).json({ message: "Logged out successfully" });        

    } catch (error) {
        console.error("Error during logout:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}