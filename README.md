# Boardsesh

[Join us on discord](https://discord.gg/YXA8GsXfQK)

Boardsesh is an app for controlling a ["standardized interactive climbing training boards" (SICTBs)](https://gearjunkie.com/climbing/kilter-moon-grasshopper-more-interactive-climbing-training-boards-explained) and intends to add missing functionality to boards that utilize Aurora Climbing's software, such as [Kilter](https://settercloset.com/pages/the-kilter-board),
[Tension](https://tensionclimbing.com/product/tension-board-sets/), and [Decoy](https://decoy-holds.com/pages/decoy-board).

Try it out [here](https://www.boardsesh.com/)

# Getting Started

## One-Command Setup

Run the automated setup script:

```bash
./setup-dev.sh
```

This script will:

- ✅ Check all prerequisites (Node.js, Docker, etc.)
- ✅ Install dependencies
- ✅ Set up environment files
- ✅ Optionally collect Aurora API tokens for sync features
- ✅ Set up and populate the database
- ✅ Run database migrations
- ✅ Perform final checks

Once you've ran setup, you will have a copy of both the Tension and Kilter climbs database on your computer!!

## Start Developing

After setup completes, there will be a docker container running with the database and shared date, you can then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Keeping local data up to date

Once your server is running, you can manually trigger shared sync by visiting:

- **Kilter**: [http://localhost:3000/api/internal/shared-sync/kilter](http://localhost:3000/api/internal/shared-sync/kilter)
- **Tension**: [http://localhost:3000/api/internal/shared-sync/tension](http://localhost:3000/api/internal/shared-sync/tension)

This will sync the latest climbs, climb stats, beta links, and other data from Aurora's servers.

# Current status

Basic board use works, and the app already has queue controls, open to feedback and contributions!
Using the share button in the top right corner, users can connect to each other and control the board and queue together.
Similar to Spotify Jams, no more "What climb was that?", "what climb was the last one?", "Mind if I change it?", questions during a sesh

## IOS support

Unfortunately mobile safari doesn't support web bluetooth. So to use this website on your phone you could install a ios browser that does have web ble support, for example: https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055

Bluefy is what I tested boardsesh in on my iphone and it worked like expected.

## Future features:

- Faster beta video uploads. Current process for beta videos is manual, and as a result new beta videos are almost never added. We'll implement our own Instagram integration to get beta videos faster.

# Self hosting

We plan to eventually have official support for self hosting, but currently it's still relatively involved to setup. Basically the development setup instructions should be used
for self-hosting too, but contributions would be very welcome.
The app is just a standard next.js app with Postgres.

# Thanks

This app was originally started as a fork of https://github.com/lemeryfertitta/Climbdex.
We also use https://github.com/lemeryfertitta/BoardLib for creating the database.
Many thanks to @lemeryfertitta for making this project possible!!
