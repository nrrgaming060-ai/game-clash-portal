# Arena Masters

I want to make a tournament app like this there are some photos of admin panel and user panel also giving  prompt 

Build a production-ready, full-stack Esports Tournament Web Application named "clasharena" using React, Tailwind CSS, Material 3 UI aesthetics, and Firebase (Authentication, Firestore, Cloud Storage). 



Design a ultra-modern, premium dark gaming theme using Deep Black (`#0A0A0E`), Neon Blue (`#00A8FF`), and Trophy Gold (`#FFD700`) accent colors, with smooth animations, glowing borders, and card glassmorphism.



The app must feature complete Role-Based Access Control (RBAC) split between a User Panel and an Admin Panel.



---



### 1. DATABASE SCHEMA & FIREBASE CONFIG

Set up Firestore collections with the following structures:

- `users`: { uid, name, email, phone, gameUid, avatarUrl, joinedAt, role }

- `tournaments`: { id, title, gameName, category, bannerUrl, entryFee, prizePool, map, rules (array), totalSlots, joinedSlots, startTime (timestamp), status ('UPCOMING'|'LIVE'|'COMPLETED') }

- `joined_players`: { id, tournamentId, userId, playerGameUid, joinedAt }

- `rooms`: { tournamentId, roomId, roomPassword, isUnlocked, unlockTime }

- `leaderboards`: { id, userId, userName, matchesPlayed, wins, totalKills, totalPoints }

- `notifications`: { id, title, message, createdAt, targetAudience }



---



### 2. USER PANEL FEATURES & SCREENS

1. **Authentication & Onboarding:**

   - Splash/Landing page with animated gaming graphics.

   - Onboarding slides highlighting features.

   - Dual Authentication: Google Sign-In & Phone Number OTP verification.

   - Profile completion step (forcing user to enter their In-Game Player ID/Game UID).



2. **Main Navigation Bar & Home Screen:**

   - Featured Tournaments Hero Carousel/Banner.

   - Tournament Filter by Game (e.g., BGMI, Free Fire, Valorant) and Category (Solo, Duo, Squad).

   - Dynamic Search bar with instant real-time filtering.

   - Responsive Navigation Bar (Home, My Tournaments, Leaderboard, Profile).



3. **Tournament Details & Joining Logic:**

   - Detailed Tournament page showing map, rules list, countdown timer to start time, entry fee, prize pool structure, and total joined slots vs max slots.

   - **Prevent Duplicate Join:** Query `joined_players` to verify if the current user has already joined.

   - **Auto-Slot Update:** Atomic transaction incrementing `joinedSlots` when a user registers.

   - **Secure Room Unlock Feature:** Display Room ID & Password card ONLY IF:

     1. User has joined the specific tournament.

     2. Current time is within 15 minutes of the `startTime` (or `isUnlocked` is manually set to true by Admin). Show a locked countdown state prior to this.



4. **Dashboard & Profile Pages:**

   - **My Tournaments:** Tabbed view showing Upcoming, Live, and Completed tournaments joined by the user.

   - **Match History:** Stats summary of wins/losses and points earned.

   - **Leaderboard:** Live rankings sorted by points/kills with top 3 highlighted in Gold, Silver, and Bronze aesthetics.

   - **Profile & Settings:** Edit Name, Game UID, Profile Picture, and Notification Preferences.



---



### 3. ADMIN PANEL FEATURES (Protected Route `/admin`)

1. **Admin Login & Dashboard Overview:**

   - Secure Admin-only login access checking the `admins` collection/role claims.

   - Analytics Dashboard cards: Total Users, Total Active Tournaments, Total Revenue, Total Matches Completed.



2. **Tournament Management:**

   - Form to **Create Tournament**: Title, Game Selection, Entry Fee, Prize Pool, Total Slots, Banner Image Upload (Firebase Storage integration), Rules array, Start Timestamp.

   - Edit, Cancel, or Delete existing tournaments.



3. **Room Credentials Management:**

   - Dedicated interface to upload Room ID and Room Password for any upcoming tournament.

   - Button to trigger instant unlock or configure automatic scheduled unlock 15 minutes before match start.



4. **User & Announcement Control:**

   - View and manage all registered users and their linked Game UIDs.

   - Broadcast System Notifications to all users or specific tournament participants.

   - Update Leaderboard scores and points post-match.



---



### 4. CODE ARCHITECTURE & SECURITY

- Implement modular, clean code separation (Components, Pages, Services, Hooks, Contexts).

- Apply robust Firestore Security Rules ensuring users can only view Room Passwords if authenticated and registered for that exact tournament.

- Full error handling, state validation, clear e

mpty states, and shimmering loading skeletons across all UI components.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a8cef6e8-81a7-43f8-aa9a-baf0ab806b19).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
