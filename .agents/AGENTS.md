# Aegis AI — Agent Rules

## Variable Naming Conventions

When generating or refactoring code, rename variables so they read as if written by a senior engineer at Google, Microsoft, Meta, Stripe, Vercel, or Netflix — clean, concise, consistent, and human-written rather than AI-generated.

### 1. Prefer concise, industry-standard names

| Verbose (avoid)         | Concise (use)  |
|-------------------------|----------------|
| `databaseConnection`    | `db`           |
| `database`              | `db`           |
| `connection`            | `conn`         |
| `configuration`         | `config`       |
| `repository`            | `repo`         |
| `controller`            | `ctrl`         |
| `service`               | `svc`          |
| `temporaryValue`        | `temp`         |
| `message`               | `msg`          |
| `application`           | `app`          |
| `authenticationToken`   | `authToken`    |
| `authorizationToken`    | `authzToken`   |

### 2. Keep names meaningful but avoid unnecessary words

| Verbose (avoid)                 | Concise (use) |
|---------------------------------|---------------|
| `currentAuthenticatedUser`      | `user`        |
| `currentUserProfileData`        | `profile`     |
| `selectedProductInformation`    | `product`     |
| `currentShoppingCartItems`      | `cartItems`   |

### 3. Respect context
If a variable's purpose is obvious from surrounding code, use shorter names.

### 4. Keep standard names unchanged
The following are canonical and must not be renamed:
`id`, `user`, `users`, `order`, `orders`, `item`, `items`, `count`, `size`, `index`, `total`, `sum`, `result`, `error`, `err`, `data`, `value`, `key`, `token`, `cache`, `logger`, `client`, `server`

### 5. Collections → plural; objects → singular
- Collections: `users`, `products`, `files`, `orders`
- Objects: `user`, `order`, `file`, `product`

### 6. Booleans use natural prefixes
`isValid`, `isAdmin`, `hasAccess`, `canEdit`, `shouldRetry`

### 7. Common loop variables
`i`, `j`, `k`, `item`, `user`, `file`

### 8. Never create AI-style names such as
- `currentAuthenticatedUserInformation`
- `processedDataCollection`
- `temporaryProcessingVariable`
- `calculatedIntermediateResult`

### 9. Prefer names found in mature open-source projects and production codebases.

### 10. Naming must be consistent throughout the entire project.

### 11. Do NOT rename
Public APIs, exported functions, database columns, JSON keys, environment variables, or framework-required identifiers — unless explicitly instructed.
