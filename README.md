# Suki — Social Media Management Prototype

This package contains the complete HTML, CSS, and JavaScript source of the Suki prototype, exported from source commit 8a4b26e53e6090658aaf6fc8114e8d6a16c12508.

## Open and run

1. Extract this ZIP.
2. Open the `suki-source-code` folder in VS Code, IBM Bob, or another editor.
3. Open `index.html` in your browser. There is no build step or package installation.

You can also serve the folder with Python:

```sh
python -m http.server 8000
```

Then visit http://localhost:8000. On Windows, `py -m http.server 8000` also works when the Python launcher is installed.

## Files

- `index.html`: Application shell, metadata, and favicon.
- `style.css`: All styling, typography, and responsive layouts.
- `app.js`: Demo data, navigation, screens, and interactive behavior.
- `README.md`: This guide.

## What is included

Home dashboard, AI marketing workspace, five-step campaign creator, calendar with drag-and-drop rescheduling, content library, products and services, analytics, brand profile, social account connections, subscription preview, and settings.

This is a vanilla JavaScript application, not a React project. Its screens use hash navigation such as `#home`, `#calendar`, and `#products`.

## Prototype limitations

- AI responses and recommendations use templates and sample data, not a live model.
- Social account connections and publishing are simulated.
- Analytics and billing are illustrative.
- Edits and uploaded images remain in memory for the current page session. Refreshing restores the sample data.
- Images load from Unsplash, and fonts load from Google Fonts; internet access is needed for these external assets.
- Clipboard access depends on browser permissions and secure-context support.
- Optional WebMCP tools are feature-detected and only register in supporting browsers.

No backend, API keys, credentials, dependencies, or database are required. The hosted Site's deployment configuration and Git metadata are omitted from this portable export.

## Editing

Change the `state` object in `app.js` to adjust the sample business, products, and posts. Shared colors are CSS variables near the top of `style.css`. Page functions in `app.js` render each screen; `render()` selects the current page.

## Image sources

The source references these remote image assets; they are not bundled:

- Matcha: https://images.unsplash.com/photo-1749280447307-31a68eb38673
- Iced latte: https://unsplash.com/photos/a-person-holding-a-drink-with-a-straw-in-it-WfuIO53oaTA
- Croissant: https://unsplash.com/photos/a-croissant-on-a-plate-with-butter-and-a-knife-fc8y5qpBKWQ

Review applicable image and font licenses before reusing third-party assets in a production product.
