# Console Error Triage

## Chrome Extension Image Errors

Errors shaped like this are browser-extension noise, not app-owned requests:

```text
Denying load of chrome-extension://<extension-id>/https://i.imgur.com/<image>.jpg
Resources must be listed in the web_accessible_resources manifest key
```

The app source does not reference `chrome-extension://`, Imgur, or the reported image URL. Chrome is blocking an installed extension because that extension is trying to expose an external image through its own extension URL without listing it in its manifest.

To confirm, test the site in Incognito with extensions disabled or disable the extension with the matching ID. If the error disappears, no Lumos code change is needed.

## CSP Eval Errors

The production CSP deliberately does not include `unsafe-eval`. If DevTools reports blocked string evaluation, inspect the violation source/stack first:

- If the source starts with `chrome-extension://`, treat it as extension noise.
- If the source is an app bundle, remove the eval-style code path or replace the dependency.
- Do not add `unsafe-eval` to fix extension or dependency warnings.
