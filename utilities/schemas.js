const { z } = require("zod");

const signup = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

const login = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const forgetPassword = z.object({
  email: z.string().trim().email(),
});

const resetPassword = z.object({
  email: z.string().trim().email(),
  otp: z.union([z.string().min(4), z.number()]),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

const planWrite = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    price: z.coerce.number().positive().optional(),
    discount: z.coerce.number().min(0).max(100).optional(),
    duration: z.coerce.number().positive().optional(),
    category: z.string().optional(),
  })
  .passthrough();

const bookingItem = z
  .object({
    _id: z.string().optional(),
    plan: z.string().optional(),
    quantity: z.coerce.number().int().positive().optional(),
  })
  .passthrough()
  .refine((item) => Boolean(item._id || item.plan), {
    message: "plan id is required",
  });

const bookingCreate = z.union([
  z.object({ cartItems: z.array(bookingItem).min(1) }).passthrough(),
  bookingItem,
]);

module.exports = {
  signup,
  login,
  forgetPassword,
  resetPassword,
  planWrite,
  bookingCreate,
};
