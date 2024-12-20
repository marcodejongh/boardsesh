# Boardsesh

[Join us on discord](https://discord.gg/YXA8GsXfQK)

Boardsesh is an app for controlling a ["standardized interactive climbing training boards" (SICTBs)](https://gearjunkie.com/climbing/kilter-moon-grasshopper-more-interactive-climbing-training-boards-explained) and intends to add missing functionality to boards that utilize Aurora Climbing's software, such as [Kilter](https://settercloset.com/pages/the-kilter-board),
[Tension](https://tensionclimbing.com/product/tension-board-sets/), and [Decoy](https://decoy-holds.com/pages/decoy-board).

Try it out [here](https://www.boardsesh.com/)

This app was originally started as a fork of https://github.com/lemeryfertitta/Climbdex.
We also use https://github.com/lemeryfertitta/BoardLib for creating the database.
Many thanks to @lemeryfertitta for making this project possible!!

## IOS support

Unfortunately mobile safari doesn't support web bluetooth. So to use this website on your phone you could install a ios browser that does have web ble support, for example: https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055

Bluefy is what I tested boardsesh in on my iphone and it worked like expected.

## Current status

Basic board use works, and the app already has queue controls, open to feedback and contributions!
Using the share button in the top right corner, users can connect to each other and control the board and queue together.
Similar to Spotify Jams, no more "What climb was that?", "what climb was the last one?", "Mind if I change it?", questions during a sesh

## Future features:

- Faster beta video uploads. Current process for beta videos is manual, and as a result new beta videos are almost never added. We'll implement our own Instagram integration to get beta videos faster.

# Getting Started

## Database setup

Before we can start developing, we need to setup a database. Start the docker container to startup the development database:

```
cd db/ && docker-compose up
```

This starts up a docker container that uses Boardlib to download the databases and then loads them into postgres with an db update script and pgloader. When the postgres docker container is up,
you can connect to the database on localhost:54320 using `default:password` as the login details.

## Setup ENV variables

Create the following `.env.development.local`:

```
VERCEL_ENV=development
POSTGRES_URL=postgresql://default:password@localhost:54320/verceldb
BASE_URL=http://localhost:3000
```

## Running webapp

In root of the repo, npm install the dependencies

```
npm install
```

Now we can run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
