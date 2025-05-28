import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
        return res.status(401).json({ message: "Unauthenticated" });
    }
    jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
        if (err) {
            return res.status(401).json({ message: "Token not valid" });
        }
        req.user = payload;
        next();
    });
}