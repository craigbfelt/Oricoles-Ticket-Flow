# Iframe Embedding Guide - Oricol Helpdesk App

This guide provides comprehensive instructions for embedding the Oricol Helpdesk application into your website using an iframe.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Basic Embedding](#basic-embedding)
3. [Advanced Configurations](#advanced-configurations)
4. [Platform-Specific Integration](#platform-specific-integration)
5. [Security & CORS](#security--cors)
6. [Troubleshooting](#troubleshooting)
7. [Production Deployment](#production-deployment)

---

## 🚀 Quick Start

### For Local Development

```html
<iframe 
    src="http://localhost:8080" 
    width="100%" 
    height="800px"
    title="Oricol Helpdesk"
    frameborder="0"
></iframe>
```

### For Production

```html
<iframe 
    src="https://your-domain.com" 
    width="100%" 
    height="800px"
    title="Oricol Helpdesk"
    frameborder="0"
></iframe>
```

**Note:** Replace `https://your-domain.com` with your actual deployed URL.

---

## 🎯 Basic Embedding

### Full-Width Responsive Iframe

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Helpdesk Portal</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        .helpdesk-container {
            width: 100%;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        .helpdesk-iframe {
            width: 100%;
            height: 80vh;
            min-height: 600px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <div class="helpdesk-container">
        <iframe 
            src="http://localhost:8080"
            class="helpdesk-iframe"
            title="Oricol Helpdesk System"
            allow="clipboard-read; clipboard-write"
        ></iframe>
    </div>
</body>
</html>
```

### Fixed Height Iframe

```html
<div style="width: 100%; max-width: 1200px; margin: 0 auto;">
    <iframe 
        src="http://localhost:8080"
        width="100%"
        height="900px"
        style="border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
        title="Helpdesk"
    ></iframe>
</div>
```

---

## ⚙️ Advanced Configurations

### Full-Screen Iframe with Header

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Support Portal</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .top-bar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .top-bar h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        .top-bar .company-logo {
            height: 40px;
        }
        .iframe-container {
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            bottom: 0;
            background: #f3f4f6;
        }
        .iframe-wrapper {
            width: 100%;
            height: 100%;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }
        @media (max-width: 768px) {
            .top-bar {
                padding: 0.75rem 1rem;
            }
            .top-bar h1 {
                font-size: 1.25rem;
            }
            .iframe-container {
                top: 60px;
            }
        }
    </style>
</head>
<body>
    <div class="top-bar">
        <h1>🎫 Support Portal</h1>
        <!-- Add your company logo here -->
        <!-- <img src="logo.png" alt="Company Logo" class="company-logo"> -->
    </div>
    <div class="iframe-container">
        <div class="iframe-wrapper">
            <iframe 
                src="http://localhost:8080"
                title="Helpdesk Application"
                allow="clipboard-read; clipboard-write; fullscreen"
            ></iframe>
        </div>
    </div>
</body>
</html>
```

### Iframe with Loading Indicator

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Helpdesk Portal</title>
    <style>
        .iframe-container {
            position: relative;
            width: 100%;
            height: 800px;
        }
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        .loading-overlay.hidden {
            display: none;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <div class="iframe-container">
        <div id="loadingOverlay" class="loading-overlay">
            <div class="spinner"></div>
        </div>
        <iframe 
            src="http://localhost:8080"
            title="Helpdesk"
            onload="document.getElementById('loadingOverlay').classList.add('hidden')"
        ></iframe>
    </div>
</body>
</html>
```

### Iframe with Auto-Height Adjustment

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Helpdesk</title>
    <style>
        iframe {
            width: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <iframe 
        id="helpdeskFrame"
        src="http://localhost:8080"
        scrolling="no"
    ></iframe>

    <script>
        // Auto-adjust iframe height
        const iframe = document.getElementById('helpdeskFrame');
        
        // Set initial height
        iframe.style.height = '800px';
        
        // Listen for messages from iframe (requires postMessage implementation in app)
        window.addEventListener('message', function(e) {
            if (e.data.type === 'resize') {
                iframe.style.height = e.data.height + 'px';
            }
        });
    </script>
</body>
</html>
```

---

## 🌐 Platform-Specific Integration

### WordPress Integration

#### Method 1: HTML Block

1. Edit your page/post
2. Add an "HTML" block
3. Paste this code:

```html
<div style="width: 100%; max-width: 1400px; margin: 20px auto;">
    <iframe 
        src="http://localhost:8080" 
        style="width: 100%; height: 800px; border: 1px solid #ddd; border-radius: 8px;"
        title="Oricol Helpdesk"
        allow="clipboard-read; clipboard-write"
    ></iframe>
</div>
```

#### Method 2: Shortcode (functions.php)

Add to your theme's `functions.php`:

```php
function oricol_helpdesk_shortcode($atts) {
    $atts = shortcode_atts(array(
        'height' => '800px',
        'url' => 'http://localhost:8080'
    ), $atts);
    
    return '<div style="width: 100%; max-width: 1400px; margin: 0 auto;">
        <iframe 
            src="' . esc_url($atts['url']) . '" 
            style="width: 100%; height: ' . esc_attr($atts['height']) . '; border: none; border-radius: 8px;"
            title="Helpdesk"
        ></iframe>
    </div>';
}
add_shortcode('oricol_helpdesk', 'oricol_helpdesk_shortcode');
```

Use in posts/pages:
```
[oricol_helpdesk height="900px" url="http://localhost:8080"]
```

### React Integration

```jsx
import React from 'react';

const HelpdeskEmbed = () => {
  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '1400px', 
      margin: '0 auto',
      padding: '20px'
    }}>
      <iframe
        src="http://localhost:8080"
        title="Oricol Helpdesk"
        style={{
          width: '100%',
          height: '80vh',
          minHeight: '600px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
};

export default HelpdeskEmbed;
```

### Next.js Integration

```jsx
// pages/helpdesk.js or app/helpdesk/page.js
export default function HelpdeskPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Support Portal</h1>
      <div className="w-full h-screen">
        <iframe
          src="http://localhost:8080"
          title="Oricol Helpdesk"
          className="w-full h-full border rounded-lg shadow-lg"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
```

### Shopify Integration

1. Go to Online Store → Themes → Customize
2. Add a "Custom Liquid" section
3. Paste this code:

```liquid
<div class="helpdesk-container">
  <iframe 
    src="http://localhost:8080"
    width="100%"
    height="800px"
    frameborder="0"
    title="Helpdesk"
  ></iframe>
</div>

<style>
  .helpdesk-container {
    max-width: 1400px;
    margin: 40px auto;
    padding: 0 20px;
  }
  .helpdesk-container iframe {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }
</style>
```

### Webflow Integration

1. Add an "Embed" element to your page
2. Paste the iframe code:

```html
<iframe 
    src="http://localhost:8080"
    width="100%"
    height="800px"
    style="border: none; border-radius: 8px;"
    title="Helpdesk"
></iframe>
```

---

## 🔒 Security & CORS

### Iframe Sandbox Attributes

For enhanced security, use sandbox attributes:

```html
<iframe 
    src="http://localhost:8080"
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
    title="Helpdesk"
></iframe>
```

**Sandbox Permissions Explained:**

- `allow-same-origin` - Required for authentication and API calls
- `allow-scripts` - Required for React app to run
- `allow-forms` - Required for login, ticket creation forms
- `allow-popups` - Required for certain modal dialogs
- `allow-modals` - Required for alert/confirm dialogs
- `allow-downloads` - Add if file downloads needed

### Content Security Policy (CSP)

If your website has CSP headers, ensure iframe sources are allowed:

```html
<meta http-equiv="Content-Security-Policy" 
      content="frame-src http://localhost:8080 https://your-domain.com;">
```

### Allow Attributes

Enable specific features within the iframe:

```html
<iframe 
    src="http://localhost:8080"
    allow="clipboard-read; clipboard-write; fullscreen; camera; microphone"
    title="Helpdesk"
></iframe>
```

**Common Allow Permissions:**

- `clipboard-read` - Copy to clipboard
- `clipboard-write` - Paste from clipboard
- `fullscreen` - Fullscreen mode
- `camera` - Webcam access (if needed for remote support)
- `microphone` - Microphone access (if needed for calls)

### CORS Configuration

The app runs on the same origin when embedded, so CORS is typically not an issue for `localhost:8080`.

However, for production deployments where the app and embedding site are on different domains, you'll need to:

1. **Update Vite Config** (already configured by default for development)
2. **Configure Supabase** to allow your embedding domain
3. **Set proper headers** on your hosting platform

---

## 🐛 Troubleshooting

### Issue: Iframe Not Loading

**Symptoms:** Blank iframe or "Refused to connect" error

**Solutions:**

1. **Check if dev server is running:**
   ```bash
   npm run dev
   ```

2. **Verify URL is correct:**
   - Local: `http://localhost:8080`
   - Production: Your deployed URL

3. **Check browser console for errors:**
   - Open DevTools (F12)
   - Look for CORS or CSP errors

4. **Disable browser extensions:**
   - Some ad blockers block iframes
   - Try in incognito mode

### Issue: Authentication Not Working

**Symptoms:** Can't log in through iframe

**Solutions:**

1. **Check sandbox attributes:**
   ```html
   sandbox="allow-same-origin allow-scripts allow-forms"
   ```

2. **Ensure cookies are allowed:**
   - Modern browsers may block third-party cookies
   - Use same-origin deployment or SameSite=None cookies

3. **Check Supabase configuration:**
   - Ensure redirect URLs include iframe parent domain

### Issue: Styling Issues

**Symptoms:** App looks broken or cut off

**Solutions:**

1. **Set minimum height:**
   ```html
   <iframe style="min-height: 600px;" ... ></iframe>
   ```

2. **Remove scrolling attribute:**
   ```html
   <iframe scrolling="yes" ... ></iframe>
   ```

3. **Check viewport meta tag:**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

### Issue: Performance Issues

**Symptoms:** Slow loading, laggy interactions

**Solutions:**

1. **Add loading attribute:**
   ```html
   <iframe loading="lazy" ... ></iframe>
   ```

2. **Preload critical resources:**
   ```html
   <link rel="preconnect" href="http://localhost:8080">
   ```

3. **Optimize iframe size:**
   - Don't make it unnecessarily large
   - Use `will-change: transform` for smoother scrolling

---

## 🚀 Production Deployment

### Step 1: Deploy the App

Deploy to one of these free platforms:

- **Netlify:** https://www.netlify.com
- **Vercel:** https://vercel.com
- **Cloudflare Pages:** https://pages.cloudflare.com

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Step 2: Update Iframe URL

Replace local URL with production URL:

```html
<!-- Before (Local) -->
<iframe src="http://localhost:8080" ... ></iframe>

<!-- After (Production) -->
<iframe src="https://helpdesk.yourdomain.com" ... ></iframe>
```

### Step 3: Configure HTTPS

**Important:** Always use HTTPS in production:

```html
<!-- ✅ Correct -->
<iframe src="https://helpdesk.yourdomain.com" ... ></iframe>

<!-- ❌ Wrong -->
<iframe src="http://helpdesk.yourdomain.com" ... ></iframe>
```

### Step 4: Test Thoroughly

1. ✅ Test login/logout
2. ✅ Test ticket creation
3. ✅ Test file uploads
4. ✅ Test on mobile devices
5. ✅ Test in different browsers
6. ✅ Test with your website's CSP policies

---

## 📊 Advanced Features

### Communication Between Iframe and Parent

If you need the iframe to communicate with the parent page:

**In the Oricol app** (requires code modification):

```javascript
// Send message to parent
window.parent.postMessage({
  type: 'ticketCreated',
  ticketId: 123
}, '*');
```

**In your website:**

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'ticketCreated') {
    console.log('Ticket created:', event.data.ticketId);
    // Handle the event
  }
});
```

### Auto-Login with Token

For seamless integration, you can pass authentication tokens via URL parameters (requires custom implementation):

```html
<iframe src="http://localhost:8080?token=YOUR_AUTH_TOKEN" ... ></iframe>
```

---

## 📚 Additional Resources

- **Local Development Guide:** [LOCAL_DEV_GUIDE.md](./LOCAL_DEV_GUIDE.md)
- **Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Full Documentation:** [README.md](./README.md)
- **Quick Reference:** [QUICKSTART.md](./QUICKSTART.md)

---

## 💡 Best Practices

1. **Always use HTTPS in production**
2. **Set appropriate sandbox attributes**
3. **Add loading indicators for better UX**
4. **Make iframe responsive**
5. **Test on multiple devices and browsers**
6. **Configure CSP headers properly**
7. **Use specific allow attributes (not wildcard)**
8. **Monitor iframe performance**
9. **Keep iframe dimensions reasonable**
10. **Test authentication flow thoroughly**

---

## ❓ FAQ

**Q: Can I customize the appearance of the embedded app?**
A: The app has its own styling. You can modify the app's CSS files, but can't style it from the parent page due to iframe sandbox restrictions.

**Q: Will authentication work in an iframe?**
A: Yes, but ensure `allow-same-origin` is in the sandbox attribute and cookies are enabled.

**Q: Can I embed on multiple domains?**
A: Yes! The app can be embedded on any domain. Just ensure CORS is configured properly for production.

**Q: Does the iframe work on mobile?**
A: Yes, the app is responsive and works well in iframes on mobile devices.

**Q: Can users open the app in a new tab from the iframe?**
A: Add `allow-popups` to the sandbox attribute and provide a "Open in new tab" link.

---

## 🎉 You're All Set!

You now have everything you need to embed the Oricol Helpdesk app in your website. For any issues, refer to the troubleshooting section or consult the main documentation.

Happy embedding! 🚀
