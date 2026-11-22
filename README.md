# Youssef Amir, personal website

Personal site of Youssef Amir: Platform Engineer in the making, writer, and researcher.

Live at https://eng-youssefamir.github.io

## How it's built

A static site with plain HTML, CSS, and a little JavaScript. There is no build step and no framework, so it is easy to maintain and free to host on GitHub Pages.

- `data.js` holds all the content: books, certificates, roadmap, links.
- `app.js` renders the shared header and footer and fills each page from `data.js`.
- `style.css` holds the design.
- The `.html` files are the pages.

## Editing

Change content in `data.js`, commit, and the site updates in a minute or two. To add a portrait, upload an image named `photo.jpg` to the repository root.
