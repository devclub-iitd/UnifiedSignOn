import express from 'express';
import { verify } from 'jsonwebtoken';
import { secretkey } from '../config/keys';

const router = express.Router();

// Clients will hit this Route to see if they are logged in or not.
router.post('/verify-token', (req, res) => {
    // Extract Token from the post body
    const { token } = req.body;

    // If no token is present return 400 Bad Request
    if (!token) {
        return res
            .status(400)
            .json({ error: 'Authentication token not provided' });
    }

    // So the token is present, so lets verify it
    try {
        const decoded = verify(token, secretkey);
        return res.json(decoded);
    } catch (err) {
        // Could not verify the token send a 401 Unauthorized response
        return res.status(401).json({ error: err.message });
    }
});

export default router;
