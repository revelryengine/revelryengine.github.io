import { LitElement } from '../../deps/lit.js';

export function getParams() {
    // const [, match = ''] = window.location.hash.match(/\?(.*)/) || [];
    return new URLSearchParams(window.location.search.substr(1));
}

export function setParams(params) {
    const state = getParams();
    for(const p in params) {
        state.set(p, params[p]);
    }
    history.replaceState({}, document.title,  window.location.hash.replace(/(\?|$).*/, '?' + state.toString()));
}

export function deleteParams(params) {
    const state = getParams();
    for(const p in params) {
        state.delete(p);
    }
    history.replaceState({}, document.title,  window.location.hash.replace(/(\?|$).*/, '?' + state.toString()));
}

export class RevParamElement extends LitElement {
    connectedCallback(){
        const props = this.constructor.properties;
        for(const [name, value] of getParams()){
            if(props[name] && props[name].param) {
                if(props[name].type === Boolean){
                    this[name] = value === 'true' ;
                } else {
                    this[name] = props[name].type(value);
                }
            }
        }
        for(const [name, prop] of Object.entries(props)) {
            if(this[name] === undefined) this[name] = prop.default;
        }
        super.connectedCallback();
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        for(const [name] of changedProperties) {
            const value = this[name];
            if(value !== undefined) {
                const props = this.constructor.properties;
                if(props[name] && props[name].param) {
                    if(value === props[name].default) {
                        deleteParams({ [name]: true });
                    } else {
                        if(props[name].type === Boolean){
                            setParams({ [name]: value !== undefined && value !== null ? value : false });
                        } else {
                            setParams({ [name]: value });
                        }
                    }
                }
            }
        }
    }
}

export default RevParamElement;
