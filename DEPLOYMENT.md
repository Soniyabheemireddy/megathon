# ReturnShield deployment

## 1. Create MongoDB Atlas

1. Open https://www.mongodb.com/atlas and create an account or sign in.
2. Create a free shared cluster. Choose a provider and region close to your users.
3. In **Database Access**, create a database user. Save the username and password.
4. In **Network Access**, add `0.0.0.0/0` so Render or Vercel can connect. For production, restrict this later when your hosting provider's outbound IPs are known.
5. Click **Connect** -> **Drivers** and copy the connection string.
6. Replace the placeholders and use a database name, for example:

```text
mongodb+srv://USER:PASSWORD@cluster0.example.mongodb.net/returnshield?retryWrites=true&w=majority
```

URL-encode special characters in `USER` or `PASSWORD` (`@`, `:`, `/`, `?`, and `#` are common examples). Never commit this URI.

## 2. Deploy the API to Render

The repository includes [render.yaml](render.yaml), which defines both the API and the optional frontend.

1. Push the repository to GitHub.
2. In Render, choose **New** -> **Blueprint** and select the repository.
3. Render detects `render.yaml` and creates `returnshield-api` and `returnshield-web`.
4. For `returnshield-api`, set `MONGODB_URI` to the Atlas connection string. `JWT_SECRET` is generated automatically.
5. Deploy the API and copy its public URL, for example `https://returnshield-api.onrender.com`.
6. For `returnshield-web`, set `VITE_API_URL` to that API URL with no trailing slash, then redeploy the frontend.

The API health check is:

```text
https://YOUR-API.onrender.com/api/health
```

## 3. Deploy with Vercel

You can deploy the two folders as two Vercel projects.

### API project

1. In Vercel, import the GitHub repository.
2. Set **Root Directory** to `server`.
3. Vercel detects [server/vercel.json](server/vercel.json).
4. Add these environment variables under **Settings** -> **Environment Variables**:
   - `MONGODB_URI`: the Atlas connection string
   - `JWT_SECRET`: a long random secret
5. Deploy and copy the API URL.

### Frontend project

1. Import the same repository as a second Vercel project.
2. Set **Root Directory** to `client`.
3. Vercel detects [client/vercel.json](client/vercel.json).
4. Add `VITE_API_URL` with the deployed API URL and no trailing slash.
5. Deploy.

The client calls `${VITE_API_URL}/api/...`, so the API URL must not include `/api` at the end.

## 4. Local Atlas test

For a local test, create `server/.env` (this file is ignored by Git):

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.example.mongodb.net/returnshield?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-local-secret
PORT=4000
```

Then run:

```powershell
cd server
npm start
```

The example file is Atlas-based. Use the local MongoDB URI only if you intentionally want to run the installed local MongoDB service.
