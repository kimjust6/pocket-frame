# Pocket Frame

**Pocket Frame** is a self-hosted, lightweight, and customizable slideshow and photo frame manager designed for your home server. Inspired by digital picture frames, it lets you display your photos and videos (with support for Immich albums) in a gorgeous dashboard.

## Features

-   **Slideshow Dashboard**: Smooth transitions, touch/keyboard controls, and full-screen kiosk mode for viewing shared photo albums.
-   **Immich Support**: Native integration to stream photos and videos directly from Immich share links.
-   **Fallback Sources**: Built-in support for Amazon Photos and Google Photos shared links.
-   **Settings Management**: A comprehensive admin dashboard to configure theme colors (Primary, Accent, Background), slide transition timing, cache settings, album reordering, and autoplay options.
-   **Secure & Private**: Authentication with Google OAuth2 and email/password to secure settings and album management.
-   **Modern Design**: Sleek responsive layout, custom variables for color branding, and smooth transitions.

## Tech Stack

-   **Backend**: [PocketBase](https://pocketbase.io/) (Golang + SQLite embedded DB) - Handles Authentication, database storage, and API.
-   **Frontend**: [Vue.js 3](https://vuejs.org/) (Composition API, Single-File Components) + [Vite](https://vitejs.dev/).
-   **Routing & State**: [Vue Router 4](https://router.vuejs.org/) & [Pinia](https://pinia.vuejs.org/).
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/).

## Getting Started

Follow these steps to get your instance running locally.

### Prerequisites

-   **Node.js** (v18+ recommended)
-   **PocketBase**: Embedded binary managed via commands.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/kimjust6/pocket-frame.git
    cd pocket-frame
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run Development Mode**:
    This command starts both the Vite dev server with HMR and the PocketBase server:
    ```bash
    npm run dev
    ```

4.  **Build for Production**:
    Compiles the Vue 3 app into `pb_public/`:
    ```bash
    npm run build
    ```

5.  **Serve Production Build**:
    ```bash
    npm run serve
    ```
    Then visit [http://localhost:8090](http://localhost:8090).

## Project Structure

-   `src/` - Vue.js frontend application (Components, Views, Stores, Router).
-   `pb_hooks/` - PocketBase server-side hooks (slideshow API, cache control).
-   `pb_migrations/` - PocketBase database schema definitions.
-   `pb_public/` - Compiled frontend assets served by PocketBase.
-   `pb_data/` - SQLite database and local storage.

## License

This project is open-source and available under the [MIT License](LICENSE).
