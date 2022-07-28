import { LitElement, html, css } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

export class RevGLTFViewerToast extends LitElement {

    static get properties() {
        return {
            messages: { type: Array },
        }
    }

    static get styles() {
        return css`
            :host {
                position: absolute;
                display: flex;
                flex-direction: row;
                justify-content: center;
                align-items: center;
            }

            .message {
                background: var(--primary);
                padding: 8px;
                border-radius: 5px;
                text-align: center;
                user-select: none;
            }

            .message:first-child {
                animation: fadeIn 0.2s, fadeOut 0.2s;
                animation-delay: 0s, var(--time);
            }

            .message:not(:first-child) {
                display: none;
                animation: none;
            }

            @keyframes fadeIn {
                0% {
                    opacity: 0;
                }
                100% {
                    opacity: 1;
                }
            }
            @keyframes fadeOut {
                0% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                }
            }
        `;
    }

    messages = [];

    render() {
        return html`${repeat(this.messages, ({ id }) => id, ({ content, time }) => {
            return html`<div class="message" @animationend="${(e) => this.handleAnimationEnd(e)}" style="--time: ${time}ms;">${content || ''}</div>`
        })}`;
    }

    handleAnimationEnd(e) {
        if(e.animationName === 'fadeOut') {
            this.messages.shift();
            this.requestUpdate();
        }
    }

    #ids = 0;
    addMessage(content, time) {
        this.messages.push({ content, time, id: ++this.#ids });
        this.requestUpdate();
    }

}

customElements.define('rev-gltf-viewer-toast', RevGLTFViewerToast);

export default RevGLTFViewerToast;
