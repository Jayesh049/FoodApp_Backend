/**
 * OpenAPI 3 description of the FoodApp Express API.
 * Served by swagger-ui-express at /api/docs.
 */

const cookieAuth = [{ cookieAuth: [] }];
const cookieAndCsrf = [{ cookieAuth: [], csrfHeader: [] }];
const admin = [{ cookieAuth: [], csrfHeader: [] }];

function jsonBody(schema, required = true) {
  return {
    required,
    content: { "application/json": { schema } },
  };
}

function jsonResponse(description, schema) {
  return {
    description,
    content: { "application/json": { schema: schema || { type: "object" } } },
  };
}

const errorShape = {
  type: "object",
  properties: {
    message: { type: "string" },
    requestId: { type: "string", format: "uuid" },
  },
};

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "FoodApp API",
    version: "1.0.0",
    description:
      "Express API for vegetarian meal plans: auth (httpOnly JWT + CSRF), server-priced Razorpay checkout, reviews, sections, and optional RAG suggestions.",
  },
  servers: [
    { url: "http://localhost:3000", description: "Local" },
    {
      url: "https://foodapp-backend-joksepha.onrender.com",
      description: "Render",
    },
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Users" },
    { name: "Plans" },
    { name: "Reviews" },
    { name: "Bookings" },
    { name: "Location" },
    { name: "Delivery" },
    { name: "Sections" },
    { name: "Suggest" },
    { name: "Contact" },
    { name: "Media" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "JWT",
        description: "httpOnly session cookie set by login / demo / signup verify flow",
      },
      csrfHeader: {
        type: "apiKey",
        in: "header",
        name: "X-CSRF-Token",
        description: "Must match the non-httpOnly `csrf` cookie on mutating routes (except CSRF-exempt auth/webhook paths)",
      },
    },
    schemas: {
      Error: errorShape,
      SignupBody: {
        type: "object",
        required: ["name", "email", "password", "confirmPassword"],
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          confirmPassword: { type: "string", minLength: 8 },
        },
      },
      LoginBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      Plan: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          price: { type: "number" },
          discount: { type: "number" },
          duration: { type: "number" },
          category: { type: "string" },
          image: { type: "string" },
          images: { type: "array", items: { type: "string" } },
        },
      },
      BookingCreate: {
        oneOf: [
          {
            type: "object",
            required: ["cartItems"],
            properties: {
              cartItems: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  properties: {
                    _id: { type: "string" },
                    plan: { type: "string" },
                    quantity: { type: "integer", minimum: 1 },
                  },
                },
              },
            },
          },
          {
            type: "object",
            properties: {
              _id: { type: "string" },
              plan: { type: "string" },
              quantity: { type: "integer", minimum: 1 },
            },
          },
        ],
      },
      PaymentVerify: {
        type: "object",
        required: ["orderCreationId", "razorpayPaymentId", "razorpaySignature"],
        properties: {
          orderCreationId: { type: "string" },
          razorpayOrderId: { type: "string" },
          razorpayPaymentId: { type: "string" },
          razorpaySignature: { type: "string" },
          bookingIds: { type: "array", items: { type: "string" } },
        },
      },
      ReviewCreate: {
        type: "object",
        required: ["rating", "description"],
        properties: {
          rating: { type: "number", minimum: 1, maximum: 5 },
          description: { type: "string", minLength: 3 },
          review: { type: "string", description: "Alias for description" },
        },
      },
      ContactBody: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          message: { type: "string" },
          howDidYouFindUs: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness",
        security: [],
        responses: { 200: jsonResponse("OK", { type: "object", properties: { status: { type: "string" } } }) },
      },
    },
    "/health/ready": {
      get: {
        tags: ["Health"],
        summary: "Readiness (Mongo connected)",
        security: [],
        responses: {
          200: jsonResponse("Ready"),
          503: jsonResponse("Not ready", { $ref: "#/components/schemas/Error" }),
        },
      },
    },
    "/api/getkey": {
      get: {
        tags: ["Bookings"],
        summary: "Public Razorpay key id only",
        security: [],
        responses: { 200: jsonResponse("Key id", { type: "object", properties: { key: { type: "string" } } }) },
      },
    },

    "/api/v1/auth/csrf": {
      get: {
        tags: ["Auth"],
        summary: "Issue CSRF cookie + token",
        security: [],
        responses: { 200: jsonResponse("CSRF token", { type: "object", properties: { csrfToken: { type: "string" } } }) },
      },
    },
    "/api/v1/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Sign up (email verification required before login)",
        security: [],
        requestBody: jsonBody({ $ref: "#/components/schemas/SignupBody" }),
        responses: {
          200: jsonResponse("Signup accepted"),
          400: jsonResponse("Invalid input", { $ref: "#/components/schemas/Error" }),
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login; sets JWT + CSRF cookies",
        security: [],
        requestBody: jsonBody({ $ref: "#/components/schemas/LoginBody" }),
        responses: {
          200: jsonResponse("Logged in"),
          403: jsonResponse("Bad credentials or unverified email"),
        },
      },
    },
    "/api/v1/auth/demo": {
      post: {
        tags: ["Auth"],
        summary: "Demo login when DEMO_EMAIL / DEMO_PASSWORD are configured",
        security: [],
        responses: {
          200: jsonResponse("Logged in as demo user"),
          404: jsonResponse("Demo not configured"),
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout; bumps tokenVersion and clears cookies",
        security: cookieAndCsrf,
        responses: { 200: jsonResponse("Logged out"), 401: jsonResponse("Unauthorized") },
      },
    },
    "/api/v1/auth/verify-email/{token}": {
      get: {
        tags: ["Auth"],
        summary: "Verify email from link token",
        security: [],
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Verified"), 400: jsonResponse("Invalid or expired") },
      },
    },
    "/api/v1/auth/forgetPassword": {
      patch: {
        tags: ["Auth"],
        summary: "Request password-reset OTP (hashed in DB)",
        security: [],
        requestBody: jsonBody({
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" } },
        }),
        responses: { 200: jsonResponse("OTP sent if account exists"), 400: jsonResponse("Invalid input") },
      },
    },
    "/api/v1/auth/resetPassword": {
      patch: {
        tags: ["Auth"],
        summary: "Reset password with OTP",
        security: [],
        requestBody: jsonBody({
          type: "object",
          required: ["email", "otp", "password", "confirmPassword"],
          properties: {
            email: { type: "string", format: "email" },
            otp: { oneOf: [{ type: "string" }, { type: "number" }] },
            password: { type: "string", minLength: 8 },
            confirmPassword: { type: "string", minLength: 8 },
          },
        }),
        responses: { 200: jsonResponse("Password changed"), 400: jsonResponse("Invalid OTP or input") },
      },
    },

    "/api/v1/user/": {
      get: {
        tags: ["Users"],
        summary: "List users (admin)",
        security: admin,
        responses: { 200: jsonResponse("Users"), 403: jsonResponse("Admin required") },
      },
    },
    "/api/v1/user/profile": {
      get: {
        tags: ["Users"],
        summary: "Current user profile",
        security: cookieAuth,
        responses: { 200: jsonResponse("Profile"), 401: jsonResponse("Unauthorized") },
      },
    },
    "/api/v1/user/audit": {
      get: {
        tags: ["Users"],
        summary: "Recent audit events (admin)",
        security: admin,
        responses: { 200: jsonResponse("Events"), 403: jsonResponse("Admin required") },
      },
    },

    "/api/v1/plan/": {
      get: {
        tags: ["Plans"],
        summary: "List plans (optional diet=veg filter)",
        security: [],
        parameters: [{ name: "diet", in: "query", schema: { type: "string", example: "veg" } }],
        responses: { 200: jsonResponse("Plans", { type: "object", properties: { Allplans: { type: "array", items: { $ref: "#/components/schemas/Plan" } } } }) },
      },
      post: {
        tags: ["Plans"],
        summary: "Create plan (admin, optional image multipart)",
        security: admin,
        requestBody: jsonBody({ $ref: "#/components/schemas/Plan" }, false),
        responses: { 201: jsonResponse("Created"), 403: jsonResponse("Admin required") },
      },
    },
    "/api/v1/plan/sortByRating": {
      get: {
        tags: ["Plans"],
        summary: "Best-rated plans",
        security: [],
        responses: { 200: jsonResponse("Plans") },
      },
    },
    "/api/v1/plan/semantic-search": {
      get: {
        tags: ["Plans"],
        summary: "Semantic plan search (falls back when RAG is down)",
        security: [],
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
        responses: { 200: jsonResponse("Search results") },
      },
    },
    "/api/v1/plan/with-images": {
      post: {
        tags: ["Plans"],
        summary: "Create plan with images (admin multipart)",
        security: admin,
        responses: { 201: jsonResponse("Created"), 403: jsonResponse("Admin required") },
      },
    },
    "/api/v1/plan/with-video": {
      post: {
        tags: ["Plans"],
        summary: "Create plan with video (admin multipart)",
        security: admin,
        responses: { 201: jsonResponse("Created"), 403: jsonResponse("Admin required") },
      },
    },
    "/api/v1/plan/{planRoutes}": {
      get: {
        tags: ["Plans"],
        summary: "Get one plan",
        security: [],
        parameters: [{ name: "planRoutes", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Plan"), 404: jsonResponse("Not found") },
      },
      patch: {
        tags: ["Plans"],
        summary: "Update plan (admin)",
        security: admin,
        parameters: [{ name: "planRoutes", in: "path", required: true, schema: { type: "string" } }],
        requestBody: jsonBody({ $ref: "#/components/schemas/Plan" }, false),
        responses: { 200: jsonResponse("Updated"), 403: jsonResponse("Admin required") },
      },
      delete: {
        tags: ["Plans"],
        summary: "Delete plan (admin)",
        security: admin,
        parameters: [{ name: "planRoutes", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Deleted"), 403: jsonResponse("Admin required") },
      },
    },
    "/api/v1/plan/{planRoutes}/images": {
      get: {
        tags: ["Plans"],
        summary: "Plan image list",
        security: [],
        parameters: [{ name: "planRoutes", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Images") },
      },
    },
    "/api/v1/plan/{planRoutes}/video": {
      put: {
        tags: ["Plans"],
        summary: "Update plan video (admin)",
        security: admin,
        parameters: [{ name: "planRoutes", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Updated") },
      },
    },
    "/api/v1/plan/{planRoutes}/media": {
      put: {
        tags: ["Plans"],
        summary: "Update plan media (admin)",
        security: admin,
        parameters: [{ name: "planRoutes", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Updated") },
      },
    },

    "/api/v1/review/best3": {
      get: {
        tags: ["Reviews"],
        summary: "Top 3 reviews",
        security: [],
        responses: { 200: jsonResponse("Reviews") },
      },
    },
    "/api/v1/review/plan/{plan}": {
      get: {
        tags: ["Reviews"],
        summary: "Reviews for a plan",
        security: [],
        parameters: [{ name: "plan", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Reviews") },
      },
      post: {
        tags: ["Reviews"],
        summary: "Create review (purchase required)",
        security: cookieAndCsrf,
        parameters: [{ name: "plan", in: "path", required: true, schema: { type: "string" } }],
        requestBody: jsonBody({ $ref: "#/components/schemas/ReviewCreate" }),
        responses: {
          201: jsonResponse("Created"),
          403: jsonResponse("Must purchase plan first"),
        },
      },
    },
    "/api/v1/review/": {
      get: {
        tags: ["Reviews"],
        summary: "All reviews (auth)",
        security: cookieAuth,
        responses: { 200: jsonResponse("Reviews") },
      },
    },
    "/api/v1/review/my-purchases": {
      get: {
        tags: ["Reviews"],
        summary: "Plans the user can review",
        security: cookieAuth,
        responses: { 200: jsonResponse("Purchased plans") },
      },
    },
    "/api/v1/review/can-review/{plan}": {
      get: {
        tags: ["Reviews"],
        summary: "Whether the user may review a plan",
        security: cookieAuth,
        parameters: [{ name: "plan", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Eligibility") },
      },
    },
    "/api/v1/review/{id}": {
      patch: {
        tags: ["Reviews"],
        summary: "Edit own review (rating + description only)",
        security: cookieAndCsrf,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: jsonBody({ $ref: "#/components/schemas/ReviewCreate" }, false),
        responses: { 200: jsonResponse("Updated"), 403: jsonResponse("Not allowed") },
      },
      delete: {
        tags: ["Reviews"],
        summary: "Delete one review (admin)",
        security: admin,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Deleted"), 403: jsonResponse("Admin required") },
      },
    },

    "/api/v1/booking/": {
      get: {
        tags: ["Bookings"],
        summary: "List own bookings (admin sees all)",
        security: cookieAuth,
        responses: { 200: jsonResponse("Bookings"), 401: jsonResponse("Unauthorized") },
      },
      post: {
        tags: ["Bookings"],
        summary: "Create checkout; server recomputes price. Optional Idempotency-Key header.",
        security: cookieAndCsrf,
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: false,
            schema: { type: "string" },
            description: "Repeat key returns the existing order",
          },
        ],
        requestBody: jsonBody({ $ref: "#/components/schemas/BookingCreate" }),
        responses: { 200: jsonResponse("Razorpay order created"), 401: jsonResponse("Unauthorized") },
      },
    },
    "/api/v1/booking/verification": {
      post: {
        tags: ["Bookings"],
        summary: "Confirm Razorpay payment (owner + signature; idempotent)",
        security: cookieAndCsrf,
        requestBody: jsonBody({ $ref: "#/components/schemas/PaymentVerify" }),
        responses: {
          200: jsonResponse("Confirmed or duplicate"),
          400: jsonResponse("Bad signature"),
          403: jsonResponse("Not your order"),
        },
      },
    },
    "/api/v1/booking/webhook": {
      post: {
        tags: ["Bookings"],
        summary: "Razorpay webhook (raw body + WEBHOOK_SECRET)",
        security: [],
        responses: { 200: jsonResponse("Handled"), 400: jsonResponse("Invalid signature") },
      },
    },
    "/api/v1/booking/stripe-session": {
      post: {
        tags: ["Bookings"],
        summary: "Create Stripe Checkout session (optional)",
        security: cookieAndCsrf,
        requestBody: jsonBody({ $ref: "#/components/schemas/BookingCreate" }),
        responses: { 200: jsonResponse("Session URL"), 503: jsonResponse("Stripe not configured") },
      },
    },
    "/api/v1/booking/stripe-webhook": {
      post: {
        tags: ["Bookings"],
        summary: "Stripe webhook",
        security: [],
        responses: { 200: jsonResponse("Handled") },
      },
    },
    "/api/v1/booking/reconcile": {
      post: {
        tags: ["Bookings"],
        summary: "Reconcile stale checkouts (admin)",
        security: admin,
        responses: { 200: jsonResponse("Results"), 403: jsonResponse("Admin required") },
      },
    },
    "/api/v1/booking/events": {
      get: {
        tags: ["Bookings"],
        summary: "Payment events (admin)",
        security: admin,
        responses: { 200: jsonResponse("Events") },
      },
    },
    "/api/v1/booking/all": {
      delete: {
        tags: ["Bookings"],
        summary: "Delete all bookings (admin)",
        security: admin,
        responses: { 200: jsonResponse("Deleted"), 403: jsonResponse("Admin required") },
      },
    },
    "/api/v1/booking/{bookingId}": {
      get: {
        tags: ["Bookings"],
        summary: "Get booking by id (owner or admin)",
        security: cookieAuth,
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: jsonResponse("Booking"),
          403: jsonResponse("Not allowed"),
          404: jsonResponse("Not found"),
        },
      },
    },

    "/api/v1/location/ip": {
      get: {
        tags: ["Location"],
        summary: "IP geolocation (auth + rate limited)",
        security: cookieAuth,
        responses: { 200: jsonResponse("Location"), 401: jsonResponse("Unauthorized") },
      },
    },
    "/api/v1/location/current": {
      get: {
        tags: ["Location"],
        summary: "Saved user location",
        security: cookieAuth,
        responses: { 200: jsonResponse("Location") },
      },
    },
    "/api/v1/location/update": {
      post: {
        tags: ["Location"],
        summary: "Update saved location",
        security: cookieAndCsrf,
        responses: { 200: jsonResponse("Updated") },
      },
    },
    "/api/v1/location/geocode": {
      post: {
        tags: ["Location"],
        summary: "Geocode an address",
        security: cookieAndCsrf,
        responses: { 200: jsonResponse("Coordinates") },
      },
    },
    "/api/v1/location/nearby": {
      post: {
        tags: ["Location"],
        summary: "Nearby users (admin; no emails)",
        security: admin,
        responses: { 200: jsonResponse("Users"), 403: jsonResponse("Admin required") },
      },
    },
    "/api/v1/location/smart": {
      post: {
        tags: ["Location"],
        summary: "Smart location helper",
        security: cookieAndCsrf,
        responses: { 200: jsonResponse("Result") },
      },
    },
    "/api/v1/location/search": {
      post: {
        tags: ["Location"],
        summary: "Search locations",
        security: cookieAndCsrf,
        responses: { 200: jsonResponse("Results") },
      },
    },

    "/api/v1/delivery/active": {
      get: {
        tags: ["Delivery"],
        summary: "Active deliveries (admin)",
        security: admin,
        responses: { 200: jsonResponse("Deliveries") },
      },
    },
    "/api/v1/delivery/history": {
      get: {
        tags: ["Delivery"],
        summary: "Caller delivery history",
        security: cookieAuth,
        responses: { 200: jsonResponse("History") },
      },
    },
    "/api/v1/delivery/{bookingId}/status": {
      get: {
        tags: ["Delivery"],
        summary: "Delivery status for a booking",
        security: cookieAuth,
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Status") },
      },
      put: {
        tags: ["Delivery"],
        summary: "Update delivery status (admin)",
        security: admin,
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Updated"), 403: jsonResponse("Admin required") },
      },
    },
    "/api/v1/delivery/{bookingId}/location": {
      put: {
        tags: ["Delivery"],
        summary: "Update driver location (admin)",
        security: admin,
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Updated") },
      },
    },

    "/api/v1/sections/": {
      get: {
        tags: ["Sections"],
        summary: "Public home sections",
        security: [],
        responses: { 200: jsonResponse("Sections") },
      },
      post: {
        tags: ["Sections"],
        summary: "Create section (admin)",
        security: admin,
        responses: { 201: jsonResponse("Created") },
      },
    },
    "/api/v1/sections/all": {
      get: {
        tags: ["Sections"],
        summary: "All sections including inactive (admin)",
        security: admin,
        responses: { 200: jsonResponse("Sections") },
      },
    },
    "/api/v1/sections/{id}": {
      patch: {
        tags: ["Sections"],
        summary: "Update section (admin)",
        security: admin,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Updated") },
      },
      delete: {
        tags: ["Sections"],
        summary: "Delete section (admin)",
        security: admin,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: jsonResponse("Deleted") },
      },
    },

    "/api/v1/suggest/health": {
      get: {
        tags: ["Suggest"],
        summary: "RAG / suggest readiness",
        security: [],
        responses: { 200: jsonResponse("Status") },
      },
    },
    "/api/v1/suggest/query": {
      post: {
        tags: ["Suggest"],
        summary: "Ask for plan suggestions (falls back to name search)",
        security: [],
        requestBody: jsonBody({
          type: "object",
          properties: { query: { type: "string" }, q: { type: "string" } },
        }),
        responses: { 200: jsonResponse("Suggestions") },
      },
    },
    "/api/v1/suggest/order": {
      post: {
        tags: ["Suggest"],
        summary: "Phrase the caller's own orders only",
        security: cookieAndCsrf,
        responses: { 200: jsonResponse("Order summary") },
      },
    },
    "/api/v1/suggest/reindex": {
      post: {
        tags: ["Suggest"],
        summary: "Rebuild RAG index (admin)",
        security: admin,
        responses: { 200: jsonResponse("Reindexed"), 403: jsonResponse("Admin required") },
      },
    },

    "/api/v1/contact/send": {
      post: {
        tags: ["Contact"],
        summary: "Contact form email",
        security: [],
        requestBody: jsonBody({ $ref: "#/components/schemas/ContactBody" }),
        responses: { 200: jsonResponse("Sent"), 500: jsonResponse("Mail failed", { $ref: "#/components/schemas/Error" }) },
      },
    },

    "/api/v1/media/generate-image": {
      post: {
        tags: ["Media"],
        summary: "Generate a dish image (HF token required)",
        security: [],
        responses: { 200: jsonResponse("Image path"), 503: jsonResponse("Not configured") },
      },
    },
    "/api/v1/media/bulk-generate": {
      post: {
        tags: ["Media"],
        summary: "Bulk image generation",
        security: [],
        responses: { 200: jsonResponse("Batch result") },
      },
    },
  },
};
