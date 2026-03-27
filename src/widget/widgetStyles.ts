export const widgetStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');

  :host {
    all: initial;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  .sd-widget {
    position: fixed;
    inset-inline-end: 24px;
    inset-block-end: 24px;
    z-index: var(--z-index);
    display: grid;
    gap: 14px;
    width: min(390px, calc(100vw - 24px));
    color: #101318;
    font-family: "Space Grotesk", "Avenir Next", sans-serif;
  }

  .sd-widget.is-left {
    inset-inline-end: auto;
    inset-inline-start: 24px;
  }

  .sd-panel {
    overflow: hidden;
    border-radius: 28px;
    border: 1px solid rgba(13, 18, 26, 0.08);
    background:
      radial-gradient(circle at top right, rgba(249, 115, 22, 0.14), transparent 36%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 252, 255, 0.94));
    box-shadow: 0 28px 80px rgba(20, 27, 41, 0.16);
    backdrop-filter: blur(18px);
  }

  .sd-header {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 20px 20px 16px;
    color: #fff7ef;
    background: linear-gradient(135deg, var(--accent), #111827);
  }

  .sd-header h2,
  .sd-empty h3 {
    margin: 0;
  }

  .sd-kicker,
  .sd-header small,
  .sd-message__meta span,
  .sd-footer-note small,
  .sd-identity label span {
    display: block;
    opacity: 0.9;
  }

  .sd-kicker {
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.7rem;
    color: rgba(255, 244, 232, 0.86);
  }

  .sd-header h2,
  .sd-header small {
    color: inherit;
  }

  .sd-header small {
    color: rgba(255, 244, 232, 0.84);
  }

  .sd-close {
    width: 38px;
    height: 38px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
    color: #fff;
    font-size: 1.3rem;
    cursor: pointer;
  }

  .sd-body {
    display: grid;
    gap: 14px;
    padding: 16px;
  }

  .sd-intro {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
    padding: 14px 16px;
    border-radius: 22px;
    background: rgba(11, 15, 23, 0.04);
  }

  .sd-intro strong,
  .sd-launcher__text strong,
  .sd-message__meta strong {
    display: block;
  }

  .sd-intro p,
  .sd-empty p,
  .sd-message p {
    margin: 6px 0 0;
  }

  .sd-text-button,
  .sd-save {
    border: none;
    cursor: pointer;
    font: inherit;
  }

  .sd-text-button {
    background: transparent;
    color: var(--accent);
    font-weight: 700;
    white-space: nowrap;
  }

  .sd-identity {
    display: grid;
    gap: 10px;
    padding: 14px;
    border-radius: 22px;
    border: 1px solid rgba(13, 18, 26, 0.08);
    background: rgba(255, 255, 255, 0.88);
  }

  .sd-identity label {
    display: grid;
    gap: 6px;
  }

  .sd-identity input,
  .sd-composer textarea {
    width: 100%;
    border: 1px solid rgba(13, 18, 26, 0.12);
    border-radius: 16px;
    padding: 12px 14px;
    font: inherit;
    color: #0f1722;
    background: rgba(255, 255, 255, 0.95);
  }

  .sd-save,
  .sd-composer button {
    border-radius: 999px;
    padding: 11px 16px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(135deg, var(--accent), #111827);
    box-shadow: 0 14px 26px rgba(249, 115, 22, 0.22);
  }

  .sd-messages {
    display: grid;
    gap: 12px;
    min-height: 220px;
    max-height: min(45vh, 430px);
    overflow-y: auto;
    padding-right: 4px;
  }

  .sd-empty {
    padding: 18px;
    border-radius: 22px;
    text-align: center;
    color: #596274;
    background: rgba(11, 15, 23, 0.04);
  }

  .sd-empty--error {
    color: #b42318;
    background: rgba(180, 35, 24, 0.08);
  }

  .sd-message {
    max-width: 88%;
    padding: 12px 14px;
    border-radius: 22px;
    background: #fff;
    border: 1px solid rgba(13, 18, 26, 0.08);
    box-shadow: 0 12px 24px rgba(20, 27, 41, 0.05);
  }

  .sd-message.is-admin {
    margin-right: auto;
  }

  .sd-message.is-visitor {
    margin-left: auto;
    color: #fff;
    background: linear-gradient(135deg, #0f1722 0%, #1d2839 100%);
  }

  .sd-message__meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 5px;
    font-size: 0.82rem;
  }

  .sd-message p {
    white-space: pre-wrap;
  }

  .sd-footer-note {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #596274;
  }

  .sd-footer-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--accent);
  }

  .sd-composer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    padding: 0 16px 16px;
  }

  .sd-composer textarea {
    min-height: 72px;
    resize: vertical;
  }

  .sd-composer button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
    box-shadow: none;
  }

  .sd-launcher {
    display: flex;
    align-items: center;
    gap: 12px;
    border: none;
    border-radius: 999px;
    padding: 14px 16px 14px 14px;
    background: #0f1722;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 18px 40px rgba(15, 23, 34, 0.24);
  }

  .sd-launcher__glyph {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--accent), #111827);
    font-weight: 700;
  }

  .sd-launcher__text {
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  .sd-launcher__text small {
    display: block;
    opacity: 0.72;
  }

  .sd-launcher__badge {
    min-width: 28px;
    height: 28px;
    padding-inline: 8px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: #fff;
    color: #101318;
    font-size: 0.84rem;
    font-weight: 700;
  }

  @media (max-width: 640px) {
    .sd-widget,
    .sd-widget.is-left {
      inset-inline: 12px;
      inset-block-end: 12px;
      width: auto;
    }

    .sd-composer {
      grid-template-columns: 1fr;
    }

    .sd-intro {
      flex-direction: column;
    }
  }
`;
