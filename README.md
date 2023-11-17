# Netai API

Back-end service for [Netai](https://netai.vercel.app).

## Installation & Usage Instructions

Clone the project:

```sh
git clone https://github.com/kaylaiueo/netai-api.git
```

Open the directory and install the dependencies with the one of your favorite
package manager:

```sh
cd netai-api

# Node.js package manager
npm install

# Yarn package manager
yarn install

# pnpm package manager
pnpm install

# Bun runtime
bun install
```

Copy the [`.env.example`](.env.example) file into `.env` in the root directory:

```sh
cp .env.example .env
```

> [!IMPORTANT]
> You need to deploy database at [MongoDB Cloud](https://cloud.mongodb.com/) and
> create a new cluster for connecting MongoDB and getting the URL for `.env`.

Start the build process:

| Command       | Description                               |
| ------------- | ----------------------------------------- |
| `npm run dev` | Start the development instance of the app |
| `npm start`   | Start the app in production mode          |

> [!NOTE]
> If you have problem with the CORS origin, you need to change the CORS origin
> settings in the source code.

## License

Netai source code is licensed under the [MIT license](LICENSE).
