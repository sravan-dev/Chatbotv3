import { createRoot } from 'react-dom/client';
import { resolveWidgetConfig } from '../shared/config';
import type { WidgetRuntimeConfig } from '../shared/types';
import { WidgetApp } from './WidgetApp';
import { widgetStyles } from './widgetStyles';

declare global {
  interface Window {
    ChatbotWidget?: {
      init: (overrides?: Partial<WidgetRuntimeConfig>) => { destroy: () => void };
    };
    __supportDeskWidgetInstance__?: { destroy: () => void } | null;
  }
}

function mountWidget(
  script: HTMLScriptElement | null,
  overrides?: Partial<WidgetRuntimeConfig>,
): { destroy: () => void } {
  const baseConfig = resolveWidgetConfig(script);
  const config = {
    ...baseConfig,
    ...overrides,
    positionLocked: baseConfig.positionLocked || typeof overrides?.position !== 'undefined',
  };

  const host = document.createElement('div');
  host.dataset.supportDeskWidget = 'true';
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = widgetStyles;
  shadowRoot.appendChild(style);

  const rootElement = document.createElement('div');
  shadowRoot.appendChild(rootElement);

  const root = createRoot(rootElement);
  root.render(<WidgetApp config={config} />);

  return {
    destroy() {
      root.unmount();
      host.remove();
      window.__supportDeskWidgetInstance__ = null;
    },
  };
}

const currentScript =
  document.currentScript instanceof HTMLScriptElement ? document.currentScript : null;

if (!window.ChatbotWidget) {
  window.ChatbotWidget = {
    init(overrides) {
      if (!window.__supportDeskWidgetInstance__) {
        window.__supportDeskWidgetInstance__ = mountWidget(currentScript, overrides);
      }

      return window.__supportDeskWidgetInstance__;
    },
  };
}

if (!window.__supportDeskWidgetInstance__) {
  window.ChatbotWidget.init();
}
