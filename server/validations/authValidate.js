const zod = require("zod");

const registerSchema = zod.object({
    body: zod.object({
        email: zod.string().email(),
        password: zod.string().min(6).max(100),
    })
});

module.exports = { registerSchema };