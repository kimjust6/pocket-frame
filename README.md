# Pocket Frame

**Pocket Frame** is a self-hosted, lightweight, and customizable slideshow and photo frame manager designed for your home server. Inspired by digital picture frames, it lets you display your photos and videos (with support for Immich albums) in a gorgeous dashboard.

## Features

-   **Slideshow Dashboard**: Smooth transitions, touch/keyboard controls, and full-screen kiosk mode for viewing shared photo albums.
-   **Immich Support**: Native integration to stream photos and videos directly from Immich share links.
-   **Weather Widget**: Integrated weather checking powered by the free Open-Meteo API.
-   **Settings Management**: A comprehensive admin dashboard to configure theme colors (Primary, Accent, Background), weather latitude/longitude, slide transition timing, cache settings, and autoplay options.
-   **Secure & Private**: Optional authentication to secure settings management.
-   **Modern Design**: Sleek responsive layout, custom variables for custom color branding, and smooth transitions.

## Tech Stack

This project is built on a highly performant and simple stack:

-   **Backend**: [PocketBase](https://pocketbase.io/) (Golang + SQLite embedded DB) - Handles Authentication, database storage, and API.
-   **Frontend**: [PocketPages](https://github.com/pocketpages/pocketpages) - Server-side rendering using **EJS**.
-   **Interactivity**: [Alpine.js](https://alpinejs.dev/) - For lightweight, reactive UI components (Modals, Search, Forms).
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/).

## Getting Started

Follow these steps to get your own instance running locally.

### Prerequisites

-   **Node.js** (LTS version recommended)
-   **PocketBase**: PocketBase is embedded and managed via npm commands.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/kimjust6/pocket-flame-clone.git
    cd pocket-flame-clone
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the App**:
    This command starts the Tailwind watcher and the PocketBase server in dev mode.
    ```bash
    npm run dev
    ```
    If you are running in a WSL environment:
    ```bash
    npm run wsl
    ```

4.  **Visit the App**:
    Open [http://localhost:8090](http://localhost:8090) in your browser.

## Project Structure

-   `pb_hooks/` - Server-side logic and templates.
-   `pb_migrations/` - PocketBase database schema definition and seeding.
-   `pb_public/` - Static assets (compiled CSS, client JS).
-   `pb_data/` - Local database and storage (created after first run).

## License

This project is open-source and available under the [MIT License](LICENSE).
