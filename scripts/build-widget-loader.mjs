import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const distFile = resolve(process.cwd(), 'dist', 'chatbot-widget.js');

const loaderSource = `(function () {
  var globalState = window.__supportDeskWidgetLoaderState__;
  if (!globalState) {
    globalState = {};
    window.__supportDeskWidgetLoaderState__ = globalState;
  }

  if (globalState.appRequested) {
    return;
  }

  function findCurrentScript() {
    if (document.currentScript && document.currentScript.tagName === 'SCRIPT') {
      return document.currentScript;
    }

    var scripts = document.getElementsByTagName('script');

    for (var index = scripts.length - 1; index >= 0; index -= 1) {
      var candidate = scripts[index];
      var src = candidate.getAttribute('src') || '';

      if (src.indexOf('chatbot-widget.js') !== -1 && src.indexOf('chatbot-widget-app.js') === -1) {
        return candidate;
      }
    }

    return null;
  }

  function buildAppUrl(script) {
    var overrideUrl = script.getAttribute('data-app-url');

    if (overrideUrl) {
      return overrideUrl;
    }

    var sourceUrl = script.getAttribute('src') || script.src || '';
    var queryIndex = sourceUrl.indexOf('?');
    var cleanUrl = queryIndex === -1 ? sourceUrl : sourceUrl.slice(0, queryIndex);
    var query = queryIndex === -1 ? '' : sourceUrl.slice(queryIndex);

    return cleanUrl.replace(/chatbot-widget\\.js$/, 'chatbot-widget-app.js') + query;
  }

  var currentScript = findCurrentScript();

  if (!currentScript) {
    return;
  }

  if (document.querySelector('script[data-support-desk-app="true"]')) {
    globalState.appRequested = true;
    return;
  }

  if (!window.process) {
    window.process = { env: { NODE_ENV: 'production' } };
  } else if (!window.process.env) {
    window.process.env = { NODE_ENV: 'production' };
  } else if (!window.process.env.NODE_ENV) {
    window.process.env.NODE_ENV = 'production';
  }

  var appScript = document.createElement('script');
  appScript.src = buildAppUrl(currentScript);
  appScript.async = true;
  appScript.setAttribute('data-support-desk-app', 'true');
  appScript.setAttribute('data-cfasync', 'false');

  if (currentScript.nonce) {
    appScript.nonce = currentScript.nonce;
  }

  for (var attributeIndex = 0; attributeIndex < currentScript.attributes.length; attributeIndex += 1) {
    var attribute = currentScript.attributes[attributeIndex];

    if (attribute && attribute.name && attribute.name.indexOf('data-') === 0) {
      appScript.setAttribute(attribute.name, attribute.value);
    }
  }

  var parent = document.head || document.body || currentScript.parentNode;

  if (!parent) {
    return;
  }

  appScript.onerror = function () {
    globalState.appRequested = false;
  };

  globalState.appRequested = true;

  parent.appendChild(appScript);
})();`;

await mkdir(dirname(distFile), { recursive: true });
await writeFile(distFile, loaderSource);
