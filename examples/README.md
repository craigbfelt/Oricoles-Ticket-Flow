# Iframe Embedding Examples

This directory contains example HTML files demonstrating how to embed the Oricol Helpdesk application in a website using iframes.

## 📁 Available Examples

### 1. `iframe-basic.html`
**Basic iframe embedding with header and info box**

- Clean, simple layout
- Responsive design
- Information banner explaining development mode
- Minimum height of 600px
- Perfect for learning the basics

**How to use:**
1. Start the dev server: `npm run dev`
2. Open `iframe-basic.html` in your browser

### 2. `iframe-fullscreen.html`
**Full-screen embedded experience with custom top bar**

- Fixed top navigation bar
- Full viewport height
- Loading indicator
- Refresh and "Open in new tab" buttons
- Error handling
- Mobile responsive

**How to use:**
1. Start the dev server: `npm run dev`
2. Open `iframe-fullscreen.html` in your browser

## 🚀 Quick Start

### Option 1: Open directly in browser

```bash
# Start the development server
npm run dev

# Open example in browser (macOS/Linux)
open examples/iframe-basic.html

# Open example in browser (Windows)
start examples/iframe-basic.html
```

### Option 2: Serve via HTTP server

For better testing (especially for CORS and cookies):

```bash
# Install a simple HTTP server (if you don't have one)
npm install -g http-server

# Serve the examples directory
cd examples
http-server -p 9000

# Open in browser
# http://localhost:9000/iframe-basic.html
# http://localhost:9000/iframe-fullscreen.html
```

## 📝 Customization

All examples use inline CSS for easy customization. You can modify:

- **Colors:** Change gradient colors, backgrounds, borders
- **Dimensions:** Adjust iframe height, padding, margins
- **Layout:** Modify grid, flex properties
- **Branding:** Add your logo, company name

### Example: Change header color

In `iframe-fullscreen.html`, find:
```css
.top-bar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    ...
}
```

Change to your brand colors:
```css
.top-bar {
    background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
    ...
}
```

## 🔧 Configuration

### Change the iframe source URL

**For local development:**
```html
<iframe src="http://localhost:8080" ...></iframe>
```

**For production:**
```html
<iframe src="https://your-domain.com" ...></iframe>
```

### Adjust iframe height

**Fixed height:**
```html
<div class="iframe-wrapper" style="height: 900px;">
```

**Viewport height:**
```html
<div class="iframe-wrapper" style="height: 90vh;">
```

**Full screen:**
```html
<div class="iframe-wrapper" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;">
```

## 🎨 Use Cases

### Corporate Website Integration
Use `iframe-basic.html` as a starting point to embed the helpdesk in your corporate website.

### Customer Support Portal
Use `iframe-fullscreen.html` to create a dedicated support portal with your branding.

### Intranet Integration
Modify either example to match your intranet design system.

### Mobile App WebView
Both examples work well in mobile app webviews (React Native, Flutter, etc.)

## 🔒 Security Notes

All examples include appropriate security attributes:

```html
<iframe 
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
    allow="clipboard-read; clipboard-write; fullscreen"
    ...>
</iframe>
```

For production:
1. Replace `http://localhost:8080` with your HTTPS URL
2. Adjust sandbox attributes based on your security requirements
3. Configure CSP headers on your server
4. Test thoroughly in all target browsers

## 📱 Mobile Responsive

Both examples are mobile-responsive:
- Flexible layouts that adapt to screen size
- Optimized for touch interactions
- Minimum heights to ensure usability
- Media queries for tablet and mobile views

## 🐛 Troubleshooting

### Iframe shows blank or "Cannot connect"

**Solutions:**
1. Ensure dev server is running: `npm run dev`
2. Check the URL in iframe src matches your dev server
3. Look for errors in browser console (F12)

### Authentication not working

**Solutions:**
1. Add `allow-same-origin` to sandbox attribute
2. Ensure cookies are enabled in browser
3. Check if browser is blocking third-party cookies

### Styling looks broken

**Solutions:**
1. Clear browser cache
2. Ensure viewport meta tag is present
3. Check for CSS conflicts with parent page

## 📚 Learn More

- **Full embedding guide:** [../IFRAME_EMBEDDING.md](../IFRAME_EMBEDDING.md)
- **Local setup guide:** [../LOCAL_DEV_GUIDE.md](../LOCAL_DEV_GUIDE.md)
- **Main documentation:** [../README.md](../README.md)

## 💡 Tips

1. **Always test in multiple browsers** (Chrome, Firefox, Safari, Edge)
2. **Test on mobile devices** for responsive behavior
3. **Use browser DevTools** to debug iframe issues
4. **Check console logs** for CORS or CSP errors
5. **Start simple** with iframe-basic.html, then customize

## 🎉 Next Steps

1. Choose an example that fits your needs
2. Customize colors and layout
3. Test locally
4. Deploy to production
5. Update iframe src URL to production domain

Happy embedding! 🚀
